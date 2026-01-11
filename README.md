# CCTV Remote Control

CCTV 直播远程控制油猴脚本 - 支持自动全屏播放和远程切换频道。

## 功能特性

- **一键全屏**：打开直播页面后，点击按钮即可全屏播放
- **远程控制**：通过 WebSocket 连接服务器，支持远程切换频道
- **自动重连**：WebSocket 断线后自动重连
- **HTTP API**：通过简单的 HTTP 请求控制播放

## 项目结构

```
cntv/
├── cctv-remote-control.user.js    # 油猴脚本
├── README.md                       # 项目说明
└── server/
    ├── server.js                   # WebSocket + HTTP 服务器
    └── package.json                # Node.js 依赖配置
```

## 安装使用

### 1. 安装油猴脚本

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/)
2. 点击 Tampermonkey 图标 → 「添加新脚本」
3. 删除默认内容，将 `cctv-remote-control.user.js` 的内容粘贴进去
4. 按 `Ctrl+S` 保存

### 2. 启动控制服务器

```bash
# 进入服务器目录
cd server

# 安装依赖
npm install

# 启动服务器
npm start
```

服务器启动后会显示：
- WebSocket 服务：`ws://localhost:8080`
- HTTP API 服务：`http://localhost:3000`

### 3. 开始使用

1. 打开浏览器访问 https://tv.cctv.com/live/cctv1/
2. 页面加载后会显示「点击全屏播放」按钮
3. 点击按钮进入全屏模式
4. 使用 HTTP API 远程控制频道

## HTTP API

| 接口 | 说明 | 示例 |
|------|------|------|
| `GET /switch/:channel` | 切换频道 | `curl http://localhost:3000/switch/cctv13` |
| `GET /fullscreen` | 进入全屏 | `curl http://localhost:3000/fullscreen` |
| `GET /exit-fullscreen` | 退出全屏 | `curl http://localhost:3000/exit-fullscreen` |
| `GET /status` | 查看状态 | `curl http://localhost:3000/status` |
| `GET /channels` | 频道列表 | `curl http://localhost:3000/channels` |

### 使用示例

```bash
# 切换到 CCTV-1 综合频道
curl http://localhost:3000/switch/cctv1

# 切换到 CCTV-5 体育频道
curl http://localhost:3000/switch/cctv5

# 切换到 CCTV-13 新闻频道
curl http://localhost:3000/switch/cctv13

# 查看当前连接的客户端数量
curl http://localhost:3000/status
```

## 支持的频道

| 频道 | 名称 |
|------|------|
| cctv1 | CCTV-1 综合 |
| cctv2 | CCTV-2 财经 |
| cctv3 | CCTV-3 综艺 |
| cctv4 | CCTV-4 中文国际 |
| cctv5 | CCTV-5 体育 |
| cctv5plus | CCTV-5+ 体育赛事 |
| cctv6 | CCTV-6 电影 |
| cctv7 | CCTV-7 国防军事 |
| cctv8 | CCTV-8 电视剧 |
| cctv9 | CCTV-9 纪录 |
| cctv10 | CCTV-10 科教 |
| cctv11 | CCTV-11 戏曲 |
| cctv12 | CCTV-12 社会与法 |
| cctv13 | CCTV-13 新闻 |
| cctv14 | CCTV-14 少儿 |
| cctv15 | CCTV-15 音乐 |
| cctv16 | CCTV-16 奥林匹克 |
| cctv17 | CCTV-17 农业农村 |
| cctveurope | CCTV 欧洲 |
| cctvamerica | CCTV 美洲 |

## 配置说明

### 油猴脚本配置

在 `cctv-remote-control.user.js` 文件顶部可以修改配置：

```javascript
const CONFIG = {
    wsUrl: 'ws://localhost:8080',      // WebSocket 服务器地址
    reconnectInterval: 3000,            // 重连间隔（毫秒）
    maxReconnectAttempts: 10,           // 最大重连次数
    heartbeatInterval: 30000            // 心跳间隔（毫秒）
};
```

### 服务器配置

在 `server/server.js` 文件顶部可以修改端口：

```javascript
const WS_PORT = 8080;   // WebSocket 端口
const HTTP_PORT = 3000; // HTTP API 端口
```

## WebSocket 消息协议

### 服务器 → 客户端

```json
// 切换频道
{ "action": "switch_channel", "channel": "cctv13" }

// 进入全屏
{ "action": "fullscreen" }

// 退出全屏
{ "action": "exit_fullscreen" }

// 心跳响应
{ "action": "pong" }
```

### 客户端 → 服务器

```json
// 上报当前频道
{ "type": "status", "channel": "cctv1" }

// 心跳
{ "type": "ping" }
```

## 常见问题

### Q: 全屏按钮点击无效？
A: 浏览器安全策略要求全屏必须由用户手势触发，请确保直接点击按钮而非通过脚本触发。

### Q: WebSocket 连接失败？
A: 请确保服务器已启动，并检查防火墙设置是否允许 8080 端口。

### Q: 如何在远程服务器上使用？
A: 修改油猴脚本中的 `wsUrl` 为远程服务器地址，如 `ws://your-server.com:8080`。

## License

MIT
