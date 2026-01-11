# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCTV Remote Control - A Tampermonkey userscript with WebSocket server for remotely controlling CCTV live TV playback (tv.cctv.com). The system enables remote channel switching and fullscreen control via HTTP API.

## Architecture

Two-component system:
1. **Userscript** (`cctv-remote-control.user.js`): Runs in browser on tv.cctv.com/live/* pages, connects to WebSocket server, handles fullscreen and channel switching
2. **Server** (`server/server.js`): Node.js server providing both WebSocket (port 8080) for browser communication and HTTP API (port 3000) for external control

Communication flow: HTTP API → Server → WebSocket → Browser userscript

## Commands

```bash
# Start the server
cd server && npm start

# Install dependencies (first time only)
cd server && npm install
```

## HTTP API Endpoints

- `GET /switch/:channel` - Switch channel (e.g., `/switch/cctv13`)
- `GET /fullscreen` - Enter browser fullscreen (requires user gesture)
- `GET /web-fullscreen` - Enter web fullscreen (automatic)
- `GET /exit-fullscreen` - Exit browser fullscreen
- `GET /exit-web-fullscreen` - Exit web fullscreen
- `GET /status` - Get server status and connected client count
- `GET /channels` - List available channels

## WebSocket Protocol

Server → Client actions: `switch_channel`, `fullscreen`, `exit_fullscreen`, `web_fullscreen`, `exit_web_fullscreen`, `pong`, `welcome`

Client → Server messages: `status` (reports current channel), `ping` (heartbeat)

## Supported Channels

cctv1-17, cctv5plus, cctveurope, cctvamerica
