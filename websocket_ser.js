const WebSocket = require('ws');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server is running');
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 连接处理
wss.on('connection', (ws) => {
    console.log('新的客户端连接');

    // 接收消息
    ws.on('message', (message) => {
        console.log('收到消息:', message.toString());
        
        // 广播消息给所有客户端
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    // 连接关闭处理
    ws.on('close', () => {
        console.log('客户端断开连接');
    });

    // 发送欢迎消息
    ws.send('欢迎连接WebSocket服务器');
});

// 服务器监听
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`WebSocket服务器运行在 ws://localhost:${PORT}`);
});