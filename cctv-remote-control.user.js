// ==UserScript==
// @name         CCTV Remote Control
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  CCTV直播自动全屏 + WebSocket远程控制频道切换
// @match        https://tv.cctv.com/live/*
// @connect      14.103.199.253
// @connect      127.0.0.1
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ==================== 配置 ====================
    const CONFIG = {
        httpUrl: 'http://14.103.199.253:10000/poll',
        pollInterval: 3000
    };

    // 支持的频道列表
    const VALID_CHANNELS = [
        'cctv1', 'cctv2', 'cctv3', 'cctv4', 'cctv5', 'cctv5plus',
        'cctv6', 'cctv7', 'cctv8', 'cctv9', 'cctv10', 'cctv11',
        'cctv12', 'cctv13', 'cctv14', 'cctv15', 'cctv16', 'cctv17',
        'cctveurope', 'cctvamerica'
    ];

    // ==================== 全屏功能 ====================
    function createFullscreenButton() {
        // 创建全屏覆盖层
        const overlay = document.createElement('div');
        overlay.id = 'cctv-fullscreen-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            cursor: pointer;
            z-index: 999999;
        `;

        // 创建提示文字
        const hint = document.createElement('div');
        hint.innerHTML = '点击任意位置全屏播放';
        hint.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 40px;
            font-size: 24px;
            border-radius: 10px;
            font-family: "Microsoft YaHei", sans-serif;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            pointer-events: none;
        `;

        overlay.appendChild(hint);

        overlay.addEventListener('click', () => {
            enterFullscreen();
            overlay.remove();
        });

        document.body.appendChild(overlay);
    }

    function findPlayerContainer() {
        // 尝试多种选择器找到播放器容器
        const selectors = [
            '#player',
            '.player',
            '.player-container',
            '#livePlayer',
            '.live-player',
            '[class*="player"]',
            'video'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                // 如果是 video 元素，返回其父容器
                if (el.tagName === 'VIDEO') {
                    return el.parentElement || el;
                }
                return el;
            }
        }

        // 如果找不到播放器，使用 document.body
        return document.documentElement;
    }

    function enterFullscreen() {
        const container = findPlayerContainer();
        const requestFullscreen = container.requestFullscreen ||
            container.webkitRequestFullscreen ||
            container.mozRequestFullScreen ||
            container.msRequestFullscreen;

        if (requestFullscreen) {
            requestFullscreen.call(container).catch(err => {
                console.log('[CCTV Remote] 全屏请求失败:', err);
                // 尝试对整个文档全屏
                const docEl = document.documentElement;
                const docFullscreen = docEl.requestFullscreen ||
                    docEl.webkitRequestFullscreen ||
                    docEl.mozRequestFullScreen ||
                    docEl.msRequestFullscreen;
                if (docFullscreen) {
                    docFullscreen.call(docEl).catch(e => {
                        console.log('[CCTV Remote] 文档全屏也失败:', e);
                    });
                }
            });
        }
    }

    // ==================== HTTP 轮询远程控制 ====================
    let pollIntervalId = null;

    function startPolling() {
        if (pollIntervalId) return;

        console.log('[CCTV Remote] 开始 HTTP 轮询:', CONFIG.httpUrl);
        showNotification('远程控制已启动 (HTTP)', 'success');

        // 立即执行一次
        pollServer();

        pollIntervalId = setInterval(pollServer, CONFIG.pollInterval);
    }

    function stopPolling() {
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
            pollIntervalId = null;
        }
    }

    function pollServer() {
        GM_xmlhttpRequest({
            method: "GET",
            url: CONFIG.httpUrl,
            onload: function (response) {
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        handleMessage(data);
                    } catch (e) {
                        console.log('[CCTV Remote] 解析响应失败:', e);
                    }
                } else {
                    console.log('[CCTV Remote] 轮询请求失败:', response.status);
                }
            },
            onerror: function (error) {
                console.log('[CCTV Remote] 轮询请求错误:', error);
            }
        });
    }

    function handleMessage(msg) {
        try {
            console.log('[CCTV Remote] 收到消息:', msg);

            switch (msg.action) {
                case 'switch_channel':
                    switchChannel(msg.channel);
                    break;
                case 'fullscreen':
                    enterFullscreen();
                    break;
                case 'exit_fullscreen':
                    exitFullscreen();
                    break;
                case 'pong':
                    // 心跳响应
                    break;
                default:
                    console.log('[CCTV Remote] 未知命令:', msg.action);
            }
        } catch (error) {
            console.log('[CCTV Remote] 消息解析失败:', error);
        }
    }

    function getCurrentChannel() {
        const match = window.location.pathname.match(/\/live\/([^\/]+)/);
        return match ? match[1] : 'unknown';
    }

    function switchChannel(channel) {
        if (!channel) {
            console.log('[CCTV Remote] 频道参数为空');
            return;
        }

        const normalizedChannel = channel.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!VALID_CHANNELS.includes(normalizedChannel)) {
            console.log('[CCTV Remote] 无效的频道:', channel);
            showNotification(`无效频道: ${channel}`, 'error');
            return;
        }

        const currentChannel = getCurrentChannel();
        if (normalizedChannel === currentChannel) {
            console.log('[CCTV Remote] 已在当前频道');
            return;
        }

        console.log('[CCTV Remote] 切换到频道:', normalizedChannel);
        showNotification(`切换到 ${normalizedChannel.toUpperCase()}`, 'info');

        // 延迟跳转，让用户看到通知
        setTimeout(() => {
            window.location.href = `https://tv.cctv.com/live/${normalizedChannel}/`;
        }, 500);
    }

    function exitFullscreen() {
        const exitFn = document.exitFullscreen ||
            document.webkitExitFullscreen ||
            document.mozCancelFullScreen ||
            document.msExitFullscreen;
        if (exitFn) {
            exitFn.call(document);
        }
    }

    // ==================== 通知提示 ====================
    function showNotification(message, type = 'info') {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            font-size: 16px;
            font-family: "Microsoft YaHei", sans-serif;
            z-index: 999999;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // ==================== 初始化 ====================
    function init() {
        console.log('[CCTV Remote] 脚本已加载');

        // 等待页面完全加载
        if (document.readyState === 'complete') {
            onPageReady();
        } else {
            window.addEventListener('load', onPageReady);
        }
    }

    function onPageReady() {
        console.log('[CCTV Remote] 页面已就绪');

        // 延迟一点执行，确保播放器已初始化
        setTimeout(() => {
            // 创建全屏按钮
            createFullscreenButton();

            // 启动 HTTP 轮询
            startPolling();
        }, 1000);
    }

    // 启动脚本
    init();
})();
