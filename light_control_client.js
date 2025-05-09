const net = require("net");
const http = require("http");
const cors = require("cors");
const readline = require("readline");

// 配置常量
const CONFIG = {
  HOST: "10.90.7.222",
  PORT: 23,
  HTTP_PORT: 8011,
  API_PATH: "/sendCommand",
  ALLOWED_ORIGIN: "*", // 修改为实际允许的源
  COMMANDS: {
    KZ: "KZ",
    SQL: "SQL"
  }
};

/**
 * 计算给定Buffer的CRC16-Modbus校验码
 *
 * @param buffer 需要计算CRC16-Modbus校验码的Buffer
 * @returns 返回包含CRC16-Modbus校验码的Buffer
 * @throws 如果输入参数不是Buffer类型，则抛出TypeError异常
 */
function crc16Modbus(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError("Input must be a Buffer");
  }

  let crc = 0xffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xa001;
      } else {
        crc >>= 1;
      }
    }
  }
  return Buffer.from([crc & 0xff, crc >> 8]);
}

/**
 * 将输入的十六进制字符串进行处理，并返回一个二进制数组
 *
 * @param hexString 输入的十六进制字符串
 * @returns 返回一个二进制数组，表示输入的十六进制字符串从第7位到第8位之间的二进制数值
 */
function processData(hexString) {
  const targetHex = hexString.slice(6, 8);
  const binaryString = parseInt(targetHex, 16).toString(2).padStart(8, "0");
  return Array.from(binaryString, (bit) => parseInt(bit, 10));
}

const client = new net.Socket();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * 创建命令包
 *
 * @param key 按键编号
 * @param is 按键状态，0 表示按下，1 表示松开
 * @returns 返回创建的命令包的十六进制字符串
 */
function createCommandPacket(key, is) {
  const dataPacket = Buffer.from(`010500${key}${is}00`, "hex");
  const crc = crc16Modbus(dataPacket);
  return Buffer.concat([dataPacket, crc]).toString("hex").toUpperCase();
}

/**
 * 发送命令到客户端
 *
 * @param cmd 命令类型
 * @param key 地址
 * @param is 开关状态
 * @throws 如果传入的参数无效，将抛出错误
 */
function sendCommand(cmd, key, is) {
  if (!cmd || !key || !is) {
    throw new Error("Invalid parameters");
  }

  let command;
  switch (cmd.toUpperCase()) {
    case CONFIG.COMMANDS.KZ:
      command = Buffer.from(createCommandPacket(key, is), "hex");
      break;
    case CONFIG.COMMANDS.SQL:
      command = Buffer.from("0102000000187800", "hex");
      break;
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
  client.write(command);
}

http.createServer((req, res) => {
  // 手动设置 CORS 头信息
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // 预检请求，直接返回
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === CONFIG.API_PATH) {
    let body = "";
    let responseSent = false;

    req.on("data", (chunk) => body += chunk.toString());
    req.on("end", () => {
      if (responseSent) return;

      try {
        const { cmd, key, isValue } = JSON.parse(body);
        if (!cmd || !key || isValue === undefined) {
          throw new Error("Missing parameters");
        }
        sendCommand(cmd, key, isValue.toString());
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "Command sent" }));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, message: error.message }));
      }
      responseSent = true;
    });
  } else {
    if (!res.headersSent) {
      res.writeHead(404).end("Not found");
    }
  }
})
.listen(CONFIG.HTTP_PORT, () => {
  console.log(`HTTP server listening on port ${CONFIG.HTTP_PORT}`);
});

// ...（net.Socket 和 readline 相关代码保持不变）

client.connect(CONFIG.PORT, CONFIG.HOST, () => {
  console.log(`Connected to device at ${CONFIG.HOST}:${CONFIG.PORT}`);
  promptUser();
});

client.on("data", (data) => {
  const hexData = data.toString("hex");
  // 处理SQL查询接收到的数据
  if (hexData.slice(2, 4) === "02") {
    processData(hexData);
  }
  promptUser();
});

client.on("close", () => {
  console.log("Connection closed");
  rl.close();
});

client.on("error", (err) => {
  console.error("Connection error:", err);
  rl.close();
  process.exit(1);
});

/**
 * 提示用户输入命令
 */
function promptUser() {
  rl.question("> ", (cmd) => {
    cmd = cmd.trim().toLowerCase();
    if (cmd === "exit") {
      client.destroy();
      rl.close();
    } else if (cmd.startsWith("data/")) {
      const [_, cmdPart, key, is] = cmd.split("/");
      sendCommand(cmdPart, key, is);
    } else {
      console.log('Invalid command. Use "data/cmd/key/value" or "exit"');
      promptUser();
    }
  });
}