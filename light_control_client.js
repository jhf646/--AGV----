const net = require("net");

const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8089 });

let tcpDataQueue = []; // 用于存储TCP客户端接收到的数据

// WebSocket服务器连接事件
wss.on("connection", (ws) => {
  // 发送历史数据给新连接的WebSocket客户端
  tcpDataQueue.forEach((data) => ws.send(data));

  ws.on("message", (message) => {
    console.log(`Received message from WebSocket client: ${message}`);
  });
});

// 假设有一个函数receiveTcpData(data)用于处理TCP客户端接收到的数据
/**
 * 接收TCP数据并处理
 *
 * @param addr TCP连接地址
 * @param data 接收到的数据
 */
function receiveTcpData(addr,data) {
  const message = `Received from TCP ${addr}: ${data}`;
  console.log(message);
  tcpDataQueue.push(message); // 存储数据
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message); // 广播给所有连接的WebSocket客户端
    }
  });
}

/**
 * 计算Modbus CRC16校验码
 *
 * @param buffer Buffer类型的数据缓冲区
 * @returns Buffer类型，包含CRC16校验码
 * @throws 如果输入不是Buffer类型，则抛出TypeError异常
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
 * 处理数据函数
 *
 * @param hexString 十六进制字符串
 * @returns 返回二进制数组
 */
function processData(addr,hexString) {
  // 提取出d1部分
  const targetHex = hexString.slice(6, 8); // 假设d1始终位于索引6到8（不包括8）
  console.log(`Extracted Hex: ${targetHex}`);

  // 将d1从十六进制转换为二进制字符串
  const binaryString = parseInt(targetHex, 16).toString(2).padStart(8, "0"); // 确保是8位二进制
  console.log(`Binary String: ${binaryString}`);

  // 将二进制字符串拆分为数组
  const binaryArray = Array.from(binaryString, (bit) => parseInt(bit, 10));
  console.log(`Binary Array: [${binaryArray.join(", ")}]`);

  receiveTcpData(addr,binaryArray);
  return binaryArray;
}
// 配置连接参数
const clientConfigs = [
  { host: "10.90.7.222", port: 23 },
  { host: "10.90.7.221", port: 23 }, // 假设这是另一个服务器的地址和端口
  // 可以根据需要添加更多的客户端配置
];

// 创建客户端管理器，用于存储多个客户端实例
const clients = [];

// 遍历客户端配置，为每个配置创建一个新的客户端实例
clientConfigs.forEach((config) => {
  const client = new net.Socket();
  clients.push({ client, config });

  // 连接到服务器
  client.connect(config.port, config.host, () => {
    console.log(`Connected to device at ${config.host}:${config.port}`);
  });

  // 处理来自服务器的数据
  client.on("data", (data) => {
    let targetHex = data.toString("hex").slice(2, 4); // 假设处理逻辑不变
    if (targetHex === "02") {
      processData(config.host,data.toString("hex"));
    }
    console.log(
      `Received from device at ${config.host}:${config.port}:`,
      data.toString("hex")
    );
    // 这里可以添加对特定客户端的响应逻辑
  });

  // 处理客户端连接关闭
  client.on("close", () => {
    console.log(`Connection to device at ${config.host}:${config.port} closed`);
  });

  // 处理客户端错误
  client.on("error", (err) => {
    console.error(
      `Connection error to device at ${config.host}:${config.port}:`,
      err
    );
  });
});

// 发送命令到设备
function sendCommandToClient(clientInstance, cmd, key, is) {
  // if (!clientInstance || !cmd || !key || !is) {
  //   console.error("Invalid parameters");
  //   return;
  // }

  let command;
  switch (cmd.toUpperCase()) {
    case "KZ":
      command = Buffer.from(kz(key, is), "hex");
      break;
    case "SQL":
      command = Buffer.from("0102000000187800", "hex");
      break;
    default:
      console.error("Unknown command:", cmd);
      return;
  }

  console.log(
    `Sending ${cmd.toUpperCase()} command to ${clientInstance.config.host}:${
      clientInstance.config.port
    }:`,
    command.toString("hex")
  );
  clientInstance.client.write(command);
}

// 使用示例
/**
 * 生成一个带有CRC校验码的数据包
 *
 * @param key 地址
 * @param is FF00开关控制信号
 * @returns 返回带有CRC校验码的数据包（十六进制字符串）
 */
function kz(key, is) {
  console.log("key:", key);
  console.log("is:", is);
  const dataPacket = Buffer.from("010500" + key + is + "00", "hex");
  const crc = crc16Modbus(dataPacket);
  const finalPacket = Buffer.concat([dataPacket, crc]);
  const crcValue = finalPacket.toString("hex").toUpperCase();
  console.log("crcValue " + crcValue);
  return crcValue;
}

// //定时器
// let is=1
// this.timer = setInterval(() => {
//   if (clients.length > 0) {
//     const firstClient0 = clients[0];
//     const firstClient1 = clients[1];
//     // is % 2 === 0?sendCommandToClient(firstClient0,'KZ','00','00'):sendCommandToClient(firstClient0,'KZ','00','FF');
//     // is % 2 === 0?sendCommandToClient(firstClient0,'KZ','01','00'):sendCommandToClient(firstClient0,'KZ','01','FF');
//     is % 2 === 0?sendCommandToClient(firstClient0,'KZ','02','00'):sendCommandToClient(firstClient0,'KZ','02','FF');
//     // is % 2 === 0?sendCommandToClient(firstClient1,'KZ','00','00'):sendCommandToClient(firstClient1,'KZ','00','FF');
//     // is % 2 === 0?sendCommandToClient(firstClient1,'KZ','01','00'):sendCommandToClient(firstClient1,'KZ','01','FF');
//     is % 2 === 0?sendCommandToClient(firstClient1,'KZ','02','00'):sendCommandToClient(firstClient1,'KZ','02','FF');

//     is++
//   } else {
//     console.error('No clients available');
//   }

// }, 500);
this.timer = setInterval(() => {
  const firstClient0 = clients[0];
  const firstClient1 = clients[1];
  sendCommandToClient(firstClient0, "SQL", "00", "00");
  sendCommandToClient(firstClient1, "SQL", "00", "00");
}, 2000);
