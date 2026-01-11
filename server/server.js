const WebSocket = require('ws');
const http = require('http');

// ==================== 配置 ====================
const WS_PORT = 8080;
const HTTP_PORT = 3000;

// ==================== WebSocket 服务器 ====================
const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Set();

console.log(`[WebSocket] 服务器已启动，监听端口 ${WS_PORT}`);

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[WebSocket] 新客户端连接: ${clientIp}`);
    clients.add(ws);

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`[WebSocket] 收到消息:`, msg);

            switch (msg.type) {
                case 'status':
                    console.log(`[WebSocket] 客户端当前频道: ${msg.channel}`);
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ action: 'pong' }));
                    break;
                default:
                    console.log(`[WebSocket] 未知消息类型: ${msg.type}`);
            }
        } catch (error) {
            console.log(`[WebSocket] 消息解析失败:`, error.message);
        }
    });

    ws.on('close', () => {
        console.log(`[WebSocket] 客户端断开: ${clientIp}`);
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.log(`[WebSocket] 错误:`, error.message);
        clients.delete(ws);
    });

    // 发送欢迎消息
    ws.send(JSON.stringify({
        action: 'welcome',
        message: 'CCTV Remote Control Server'
    }));
});

// 广播消息给所有客户端
function broadcast(message) {
    const data = JSON.stringify(message);
    let sent = 0;
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
            sent++;
        }
    });
    return sent;
}

// 控制面板 HTML
function getControlPanelHTML() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CCTV 遥控器</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #fff;
            padding: 20px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        h1 {
            text-align: center;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .status {
            text-align: center;
            margin-bottom: 20px;
            padding: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
        }
        .status-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-dot.connected { background: #4CAF50; }
        .status-dot.disconnected { background: #f44336; }
        .section { margin-bottom: 25px; }
        .section-title {
            font-size: 16px;
            color: #aaa;
            margin-bottom: 10px;
            padding-left: 5px;
        }
        .channels {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
        }
        .btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: #fff;
            padding: 15px 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            text-align: center;
        }
        .btn:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-2px);
        }
        .btn:active {
            transform: translateY(0);
        }
        .btn.active {
            background: #e53935;
            border-color: #e53935;
        }
        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .controls .btn {
            flex: 1;
            min-width: 120px;
        }
        .toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            padding: 12px 24px;
            border-radius: 8px;
            display: none;
        }
        .toast.show { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>CCTV 遥控器</h1>
        <div class="status">
            <span class="status-dot disconnected" id="statusDot"></span>
            <span id="statusText">未连接</span>
        </div>

        <div class="section">
            <div class="section-title">频道选择</div>
            <div class="channels" id="channels"></div>
        </div>

        <div class="section">
            <div class="section-title">播放控制</div>
            <div class="controls">
                <button class="btn" onclick="sendCommand('web-fullscreen')">网页全屏</button>
                <button class="btn" onclick="sendCommand('exit-web-fullscreen')">退出网页全屏</button>
                <button class="btn" onclick="sendCommand('fullscreen')">浏览器全屏</button>
                <button class="btn" onclick="sendCommand('exit-fullscreen')">退出浏览器全屏</button>
            </div>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const channels = [
            { id: 'cctv1', name: 'CCTV-1' },
            { id: 'cctv2', name: 'CCTV-2' },
            { id: 'cctv3', name: 'CCTV-3' },
            { id: 'cctv4', name: 'CCTV-4' },
            { id: 'cctv5', name: 'CCTV-5' },
            { id: 'cctv5plus', name: 'CCTV-5+' },
            { id: 'cctv6', name: 'CCTV-6' },
            { id: 'cctv7', name: 'CCTV-7' },
            { id: 'cctv8', name: 'CCTV-8' },
            { id: 'cctv9', name: 'CCTV-9' },
            { id: 'cctv10', name: 'CCTV-10' },
            { id: 'cctv11', name: 'CCTV-11' },
            { id: 'cctv12', name: 'CCTV-12' },
            { id: 'cctv13', name: 'CCTV-13' },
            { id: 'cctv14', name: 'CCTV-14' },
            { id: 'cctv15', name: 'CCTV-15' },
            { id: 'cctv16', name: 'CCTV-16' },
            { id: 'cctv17', name: 'CCTV-17' },
            { id: 'cctveurope', name: '欧洲' },
            { id: 'cctvamerica', name: '美洲' }
        ];

        const channelsContainer = document.getElementById('channels');
        channels.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.textContent = ch.name;
            btn.onclick = () => switchChannel(ch.id);
            btn.id = 'ch-' + ch.id;
            channelsContainer.appendChild(btn);
        });

        function switchChannel(channel) {
            fetch('/switch/' + channel)
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        showToast('已切换到 ' + channel.toUpperCase());
                        document.querySelectorAll('.channels .btn').forEach(b => b.classList.remove('active'));
                        document.getElementById('ch-' + channel).classList.add('active');
                    }
                })
                .catch(e => showToast('操作失败'));
        }

        function sendCommand(cmd) {
            fetch('/' + cmd)
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        showToast('命令已发送');
                    }
                })
                .catch(e => showToast('操作失败'));
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        }

        function updateStatus() {
            fetch('/status')
                .then(r => r.json())
                .then(data => {
                    const dot = document.getElementById('statusDot');
                    const text = document.getElementById('statusText');
                    if (data.clients > 0) {
                        dot.className = 'status-dot connected';
                        text.textContent = '已连接 ' + data.clients + ' 个客户端';
                    } else {
                        dot.className = 'status-dot disconnected';
                        text.textContent = '无客户端连接';
                    }
                });
        }

        updateStatus();
        setInterval(updateStatus, 3000);
    </script>
</body>
</html>`;
}

// ==================== HTTP API 服务器 ====================
const httpServer = http.createServer((req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const url = new URL(req.url, `http://localhost:${HTTP_PORT}`);
    const path = url.pathname;

    // GET /switch/:channel - 切换频道
    const switchMatch = path.match(/^\/switch\/([a-zA-Z0-9]+)$/);
    if (switchMatch && req.method === 'GET') {
        const channel = switchMatch[1].toLowerCase();
        const sent = broadcast({
            action: 'switch_channel',
            channel: channel
        });
        console.log(`[HTTP] 切换频道: ${channel}, 发送给 ${sent} 个客户端`);
        res.end(JSON.stringify({
            success: true,
            channel: channel,
            clients: sent
        }));
        return;
    }

    // GET /fullscreen - 进入全屏
    if (path === '/fullscreen' && req.method === 'GET') {
        const sent = broadcast({ action: 'fullscreen' });
        console.log(`[HTTP] 全屏命令, 发送给 ${sent} 个客户端`);
        res.end(JSON.stringify({
            success: true,
            action: 'fullscreen',
            clients: sent
        }));
        return;
    }

    // GET /exit-fullscreen - 退出全屏
    if (path === '/exit-fullscreen' && req.method === 'GET') {
        const sent = broadcast({ action: 'exit_fullscreen' });
        console.log(`[HTTP] 退出全屏命令, 发送给 ${sent} 个客户端`);
        res.end(JSON.stringify({
            success: true,
            action: 'exit_fullscreen',
            clients: sent
        }));
        return;
    }

    // GET /web-fullscreen - 进入网页全屏（自动，无需用户点击）
    if (path === '/web-fullscreen' && req.method === 'GET') {
        const sent = broadcast({ action: 'web_fullscreen' });
        console.log(`[HTTP] 网页全屏命令, 发送给 ${sent} 个客户端`);
        res.end(JSON.stringify({
            success: true,
            action: 'web_fullscreen',
            clients: sent
        }));
        return;
    }

    // GET /exit-web-fullscreen - 退出网页全屏
    if (path === '/exit-web-fullscreen' && req.method === 'GET') {
        const sent = broadcast({ action: 'exit_web_fullscreen' });
        console.log(`[HTTP] 退出网页全屏命令, 发送给 ${sent} 个客户端`);
        res.end(JSON.stringify({
            success: true,
            action: 'exit_web_fullscreen',
            clients: sent
        }));
        return;
    }

    // GET /status - 获取状态
    if (path === '/status' && req.method === 'GET') {
        res.end(JSON.stringify({
            success: true,
            clients: clients.size,
            wsPort: WS_PORT,
            httpPort: HTTP_PORT
        }));
        return;
    }

    // GET /channels - 获取频道列表
    if (path === '/channels' && req.method === 'GET') {
        const channels = [
            'cctv1', 'cctv2', 'cctv3', 'cctv4', 'cctv5', 'cctv5plus',
            'cctv6', 'cctv7', 'cctv8', 'cctv9', 'cctv10', 'cctv11',
            'cctv12', 'cctv13', 'cctv14', 'cctv15', 'cctv16', 'cctv17',
            'cctveurope', 'cctvamerica'
        ];
        res.end(JSON.stringify({
            success: true,
            channels: channels
        }));
        return;
    }

    // GET / - 控制面板网页
    if (path === '/' && req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(getControlPanelHTML());
        return;
    }

    // GET /api - API 帮助信息
    if (path === '/api' && req.method === 'GET') {
        res.end(JSON.stringify({
            name: 'CCTV Remote Control Server',
            endpoints: {
                'GET /switch/:channel': '切换频道 (例: /switch/cctv2)',
                'GET /fullscreen': '进入浏览器全屏（需用户点击触发）',
                'GET /exit-fullscreen': '退出浏览器全屏',
                'GET /web-fullscreen': '进入网页全屏（自动，无需点击）',
                'GET /exit-web-fullscreen': '退出网页全屏',
                'GET /status': '获取服务器状态',
                'GET /channels': '获取频道列表'
            },
            examples: [
                'curl http://localhost:3000/switch/cctv1',
                'curl http://localhost:3000/switch/cctv13',
                'curl http://localhost:3000/web-fullscreen',
                'curl http://localhost:3000/exit-web-fullscreen',
                'curl http://localhost:3000/status'
            ]
        }, null, 2));
        return;
    }

    // 404
    res.statusCode = 404;
    res.end(JSON.stringify({
        success: false,
        error: 'Not Found',
        hint: '访问 / 获取帮助信息'
    }));
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`[HTTP] API 服务器已启动，监听端口 ${HTTP_PORT}`);
    console.log('');
    console.log('='.repeat(50));
    console.log('CCTV Remote Control Server 已启动');
    console.log('='.repeat(50));
    console.log('');
    console.log('使用方法:');
    console.log(`  切换到 CCTV-1:  curl http://localhost:${HTTP_PORT}/switch/cctv1`);
    console.log(`  切换到 CCTV-13: curl http://localhost:${HTTP_PORT}/switch/cctv13`);
    console.log(`  网页全屏:       curl http://localhost:${HTTP_PORT}/web-fullscreen`);
    console.log(`  退出网页全屏:   curl http://localhost:${HTTP_PORT}/exit-web-fullscreen`);
    console.log(`  查看状态:       curl http://localhost:${HTTP_PORT}/status`);
    console.log(`  频道列表:       curl http://localhost:${HTTP_PORT}/channels`);
    console.log('');
    console.log(`WebSocket 地址: ws://localhost:${WS_PORT}`);
    console.log('');
});
