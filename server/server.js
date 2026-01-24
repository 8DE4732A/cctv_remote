const http = require('http');
const crypto = require('crypto');
const geoip = require('geoip-lite');

// ==================== 配置 ====================
const HTTP_PORT = 10000;
const RAW_API_KEY = (process.env.API_KEY || '').trim();
const API_KEY = RAW_API_KEY || crypto.randomBytes(32).toString('hex');
const API_KEY_SOURCE = RAW_API_KEY ? 'env' : 'generated';
const ALLOWED_COUNTRIES = (process.env.ALLOWED_COUNTRIES || '')
    .split(',')
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);

// ==================== 状态 ====================
// 存储最新的待发送命令
let pendingCommand = null;

function getClientIp(req) {
    let ip = req.socket?.remoteAddress || '';
    if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
    }
    if (ip === '::1') {
        ip = '127.0.0.1';
    }
    return ip;
}

function isAllowedCountry(ip) {
    if (!ALLOWED_COUNTRIES.length) {
        return true;
    }
    const lookup = geoip.lookup(ip);
    if (!lookup || !lookup.country) {
        return false;
    }
    return ALLOWED_COUNTRIES.includes(lookup.country.toUpperCase());
}

function getApiKey(req, url) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
        return authHeader.slice(7).trim();
    }
    const key = url.searchParams.get('key');
    return key ? key.trim() : '';
}

function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.end(JSON.stringify(payload));
}

// ==================== HTTP API 服务器 ====================
const httpServer = http.createServer((req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const url = new URL(req.url, `http://localhost:${HTTP_PORT}`);
    const path = url.pathname;
    const clientIp = getClientIp(req);

    if (!isAllowedCountry(clientIp)) {
        return sendJson(res, 403, {
            success: false,
            error: 'Forbidden',
            message: 'IP not allowed by country restriction',
            ip: clientIp
        });
    }

    if (path !== '/') {
        const requestKey = getApiKey(req, url);
        if (requestKey !== API_KEY) {
            return sendJson(res, 401, {
                success: false,
                error: 'Unauthorized',
                message: 'Missing or invalid API key'
            });
        }
    }

    // GET /poll - 客户端轮询接口
    if (path === '/poll' && req.method === 'GET') {
        if (pendingCommand) {
            // 发送最新的命令，并清空
            console.log(`[HTTP] 响应轮询，发送命令: ${pendingCommand.action}`);
        res.end(JSON.stringify(pendingCommand));
        pendingCommand = null;
    } else {
        // 无命令，返回 pong
        res.end(JSON.stringify({ action: 'pong' }));
    }
        return;
    }

    // GET /switch/:channel - 切换频道
    const switchMatch = path.match(/^\/switch\/([a-zA-Z0-9]+)$/);
    if (switchMatch && req.method === 'GET') {
        const channel = switchMatch[1].toLowerCase();
        pendingCommand = {
            action: 'switch_channel',
            channel: channel
        };
        console.log(`[HTTP] 收到切换频道请求: ${channel}, 更新待发送命令`);

        res.end(JSON.stringify({
            success: true,
            channel: channel,
            message: 'Command updated'
        }));
        return;
    }

    // GET /fullscreen - 进入全屏
    if (path === '/fullscreen' && req.method === 'GET') {
        pendingCommand = { action: 'fullscreen' };
        console.log(`[HTTP] 收到全屏请求, 更新待发送命令`);
        res.end(JSON.stringify({
            success: true,
            action: 'fullscreen',
            message: 'Command updated'
        }));
        return;
    }

    // GET /exit-fullscreen - 退出全屏
    if (path === '/exit-fullscreen' && req.method === 'GET') {
        pendingCommand = { action: 'exit_fullscreen' };
        console.log(`[HTTP] 收到退出全屏请求, 更新待发送命令`);
        res.end(JSON.stringify({
            success: true,
            action: 'exit_fullscreen',
            message: 'Command updated'
        }));
        return;
    }

    // GET /web-fullscreen - 进入网页全屏
    if (path === '/web-fullscreen' && req.method === 'GET') {
        pendingCommand = { action: 'web_fullscreen' };
        console.log(`[HTTP] 收到网页全屏请求, 更新待发送命令`);
        res.end(JSON.stringify({
            success: true,
            action: 'web_fullscreen',
            message: 'Command updated'
        }));
        return;
    }

    // GET /exit-web-fullscreen - 退出网页全屏
    if (path === '/exit-web-fullscreen' && req.method === 'GET') {
        pendingCommand = { action: 'exit_web_fullscreen' };
        console.log(`[HTTP] 收到退出网页全屏请求, 更新待发送命令`);
        res.end(JSON.stringify({
            success: true,
            action: 'exit_web_fullscreen',
            message: 'Command updated'
        }));
        return;
    }

    // GET /status - 获取状态
    if (path === '/status' && req.method === 'GET') {
        res.end(JSON.stringify({
            success: true,
            hasPendingCommand: !!pendingCommand,
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
            auth: {
                required: true,
                methods: [
                    'Authorization: Bearer <key>',
                    '?key=<key>'
                ],
                note: 'API key is generated at startup if not configured'
            },
            countryRestriction: {
                allowedCountries: ALLOWED_COUNTRIES,
                note: 'Uses geoip-lite; empty means allow all countries'
            },
            endpoints: {
                'GET /poll': '客户端轮询接口',
                'GET /switch/:channel': '切换频道 (例: /switch/cctv2)',
                'GET /fullscreen': '进入浏览器全屏',
                'GET /exit-fullscreen': '退出浏览器全屏',
                'GET /web-fullscreen': '进入网页全屏',
                'GET /exit-web-fullscreen': '退出网页全屏',
                'GET /status': '获取服务器状态',
                'GET /channels': '获取频道列表'
            },
            examples: [
                'curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/switch/cctv1',
                'curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/poll',
                'curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/status'
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
            <span id="statusText">正在运行</span>
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
            channelsContainer.appendChild(btn);
        });

        const storedKey = window.localStorage.getItem('cctv_api_key');
        let apiKey = storedKey || window.prompt('请输入 API Key');
        if (apiKey) {
            window.localStorage.setItem('cctv_api_key', apiKey);
        }

        function withAuth(options = {}) {
            if (!apiKey) {
                return options;
            }
            return {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    Authorization: 'Bearer ' + apiKey
                }
            };
        }

        function fetchWithAuth(path) {
            if (!apiKey) {
                showToast('请先设置 API Key');
                return Promise.reject(new Error('Missing API key'));
            }
            return fetch(path, withAuth());
        }

        function switchChannel(channel) {
            fetchWithAuth('/switch/' + channel)
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
            fetchWithAuth('/' + cmd)
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
    </script>
</body>
</html>`;
}

httpServer.listen(HTTP_PORT, () => {
    console.log(`[HTTP] API 服务器已启动，监听端口 ${HTTP_PORT}`);
    console.log('支持轮询 (/poll) 和控制面板 (/)');
    console.log(`[HTTP] API Key (${API_KEY_SOURCE}): ${API_KEY}`);
    console.log(`[HTTP] Allowed countries: ${ALLOWED_COUNTRIES.length ? ALLOWED_COUNTRIES.join(', ') : 'all'}`);
});
