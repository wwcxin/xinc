# Xinc Bot - 基于 NapCat 的轻量级 QQ 机器人框架

![Xinc](https://q1.qlogo.cn/g?b=qq&nk=2436783018&s=640)

Xinc 是一个基于 NapCat 和 node-napcat-ts 的轻量级 QQ 机器人框架，专注于易用性和可扩展性。通过简单的插件系统，你可以快速构建自己的 QQ 机器人功能。

## ✨ 功能特点- 
🚀 **开箱即用**：简单的命令行工具，一键初始化和启动- 
🔌 **插件系统**：强大且灵活的插件机制，轻松扩展功能- 
🛠️ **丰富的 API**：为插件开发提供完整的类型定义和友好的接口- 
📱 **多平台支持**：支持 Windows、Linux 和 macOS- 
🔄 **热重载**：支持插件热重载，无需重启框架- 
📊 **状态监控**：内置状态查看和管理命令- 
🔒 **权限系统**：完善的权限控制机制
## 📦 安装

### 前提条件
- Node.js 16.x 或更高版本
- [NapCat](https://github.com/NapNeko/NapCatQQ) 服务端

### 安装步骤
1. 创建新项目文件夹并初始化
```bash
mkdir my-xinc-bot
cd my-xinc-bot
npm install xinc
npx xinc init
```
2. 启动框架
```bash
# 直接启动
npx xinc start
# 或者使用 PM2 在后台运行
npx xinc start --pm2
```

## 🚀 快速开始
初始化项目后，框架会自动创建一个示例插件。
你可以通过以下命令创建自己的插件：
```bash
npx xinc new 插件名称
```
启动框架后，你可以在 QQ 中发送命令与机器人交互：
- #帮助 - 显示帮助信息
- #状态 - 查看框架状态
- #插件 列表 - 查看插件列表

## 🔌 插件开发
Xinc 提供了简单直观的插件 API，以下是一个基本插件示例：
```typescript
import { definePlugin, Structs } from 'xinc'

export default definePlugin({ 
    name: '你好世界', 
    version: '1.0.0', 
    desc: '一个简单的示例插件', 
    setup(ctx) { 
        // 处理消息 
        ctx.handle('message', async e => { 
            if (e.raw_message === '你好') { 
                e.reply('世界，你好！') 
            } 
        }) 
            // 记录插件加载信息 
        ctx.logger.info('插件已加载') 
    }
})
```

### 插件上下文 
API插件上下文 ctx 提供了丰富的 API：
- **消息处理**：handle, reply, sendPrivateMsg, sendGroupMsg
- **信息获取**：getText, getImageURL, getAtUserID, getGroupList
- **权限控制**：isRoot, isAdmin, isGroupAdmin
- **群管理**：setGroupBan, setGroupKick, setGroupCard

## 📋 命令列表

### 基础命令
- #状态 - 查看框架状态
- #帮助 - 显示帮助信息
- #退出 - 关闭框架（仅限主人）

### 插件管理
- #插件 列表 - 查看插件列表
- #插件 启用 <插件名> - 启用指定插件
- #插件 禁用 <插件名> - 禁用指定插件
- #插件 重载 <插件名> - 重载指定插件

### 设置命令（仅限主人）
- #设置 加管理 <QQ> - 添加框架管理员
- #设置 删管理 <QQ> - 删除框架管理员
- #设置 加主人 <QQ> - 添加框架主人
- #设置 删主人 <QQ> - 删除框架主人
- #设置 前缀 <前缀> - 修改命令前缀
- #设置 日志 <级别> - 修改日志级别

## 📄 配置文件配置文件 
xinc.config.toml 包含以下内容：
```toml
host = "127.0.0.1"
port = 5700
prefix = "#"
root = [12345678]
admins = []
plugins = ["你好世界"]
logger = "info"
```
## 🤝 贡献指南
欢迎贡献代码、提交 issue 或改进文档。
请遵循以下步骤：
1. Fork 项目
2. 创建功能分支 (git checkout -b feature/amazing-feature)
3. 提交更改 (git commit -m 'Add some amazing feature')
4. 推送到分支 (git push origin feature/amazing-feature)
5. 创建 Pull Request

## 📃 许可证本项目采用 GPL-3.0 许可证。
详情请参阅 [LICENSE](LICENSE) 文件。

## 致谢
- [NapCat](https://github.com/wwcxin/napcat) 
- 底层通信框架- [node-napcat-ts](https://github.com/wwcxin/node-napcat-ts) 
- kivibot
- Node.js 

API 实现---Made with ❤️ by [勿忘初心](https://github.com/wwcxin)