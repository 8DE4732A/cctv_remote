# CCTV Remote Control

CCTV 直播远程控制油猴脚本 - 支持自动全屏播放和 HTTP 远程控制，适配 PC 浏览器及 Android TV。

## 功能特性

- **一键全屏**：打开直播页面后，点击全屏浮层即可进入全屏播放。
- **多种触发方式**：
  - 点击浮层
  - 滚动滚轮 (PC)
  - 遥控器确认键/Enter键 (Android TV)
- **远程控制**：通过 HTTP 轮询机制，支持局域网内远程切换频道和控制全屏。
- **跨域支持**：使用 `GM_xmlhttpRequest` 解决 Web 页面与本地服务的跨域问题。
- **状态同步**：服务端维护最新指令状态，避免指令堆积。
- **访问控制**：API Key 鉴权 + IP 国家/地区限制（可选）。

## 项目结构

```
cntv/
├── cctv-remote-control.user.js    # 油猴脚本
├── README.md                       # 项目说明
└── server/
    ├── server.js                   # HTTP 控制服务器 (Port 10000)
    └── package.json                # Node.js 依赖配置
```

## 安装使用

### 1. 启动控制服务器

服务器是远程控制的核心，需在本地或局域网设备上运行。

```bash
# 进入服务器目录
cd server

# 安装依赖
npm install

# 启动服务器 (默认端口 10000)
npm start
```

服务器启动后：
- 控制面板 & API 服务：`http://localhost:10000`
- 轮询接口：`http://localhost:10000/poll`

启动日志会输出 API Key（如未配置会自动生成）。

### 2. 安装油猴脚本

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/)
2. 添加新脚本，将 `cctv-remote-control.user.js` 的内容粘贴进去并保存。
3. **重要**：脚本头部需配置服务器地址。默认配置指向 `http://127.0.0.1:10000/poll`。如服务器在另一台机器，请修改 IP，并附上 API Key：

```javascript
const CONFIG = {
    // 修改为你的服务器 IP，携带 API Key
    httpUrl: 'http://192.168.1.100:10000/poll?key=YOUR_KEY',
    pollInterval: 3000
};
```

4. 首次运行时，Tampermonkey 可能会询问跨域请求权限，请选择 **"总是允许" (Always allow)**。

## HTTP API 控制

你可以通过浏览器访问控制面板 (`http://localhost:10000`) 进行操作（首次会提示输入 API Key，并保存到 LocalStorage），或直接调用 HTTP API：

| 接口 | 说明 | 示例 |
|------|------|------|
| `GET /switch/:channel` | 切换频道 | `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/switch/cctv1` |
| `GET /fullscreen` | 进入浏览器全屏 | `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/fullscreen` |
| `GET /exit-fullscreen` | 退出浏览器全屏 | `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/exit-fullscreen` |
| `GET /web-fullscreen` | 进入网页全屏 | `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/web-fullscreen` |
| `GET /exit-web-fullscreen` | 退出网页全屏 | `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/exit-web-fullscreen` |
| `GET /status` | 查看状态 | `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/status` |
| `GET /channels` | 获取频道列表 | `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:10000/channels` |

### 访问控制配置

- `API_KEY`：API 鉴权密钥；未配置时会随机生成并打印到控制台日志。
- `ALLOWED_COUNTRIES`：允许访问的国家/地区（ISO 国家码，逗号分隔，如 `US,CA`）。为空则不限制。

示例：

```bash
API_KEY=YOUR_KEY ALLOWED_COUNTRIES=US,CA npm start
```

## Android TV 支持

脚本针对 Android TV 进行了优化：
- 支持遥控器 **"确认/OK"** 键 (Key Code 13/23) 触发全屏。
- 建议配合蓝牙键盘或鼠标映射工具使用。

## 常见问题

### Q: 为什么需要 HTTP 轮询而不是 WebSocket？
A: CCTV 直播页面是 HTTPS 环境，现代浏览器禁止 HTTPS 页面连接不安全的 WS (WebSocket) 服务，且存在跨域限制。改用 `GM_xmlhttpRequest` 进行 HTTP 轮询可以完美绕过这些限制。

### Q: 远程控制有延迟？
A: 脚本默认每 3 秒轮询一次 (`pollInterval: 3000`)。你可以修改脚本中的配置来缩短间隔，但建议不要低于 1000ms 以免给服务器造成压力。

### Q: 全屏无法触发？
A: 浏览器通常要求全屏操作必须由"用户手势"（点击、按键）触发。脚本通过浮层诱导点击或按键来满足此要求。如果在无人值守情况下无法自动全屏，这是浏览器的安全限制。

## License

MIT
