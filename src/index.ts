import { App } from './core/App'
import { definePlugin, Structs } from './core/plugin'

// 导出插件系统
export { definePlugin, Structs }
// src/index.ts
export * from './core/plugin';
export * from './napcat/Structs';
export * from './core/Logger';
export * from './core/config';
export * from './core/App';

const main = async () => {
  const app = new App()
  
  // 优雅退出
  process.on('SIGINT', async () => {
    await app.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await app.stop()
    process.exit(0)
  })

  // 捕获未处理的异常
  process.on('uncaughtException', async (error) => {
    console.error('未捕获的异常:', error)
    await app.stop()
    process.exit(1)
  })

  // 捕获未处理的 Promise 拒绝
  process.on('unhandledRejection', async (reason) => {
    console.error('未处理的 Promise 拒绝:', reason)
    await app.stop()
    process.exit(1)
  })

  // 初始化并启动应用
  await app.init()
  await app.start().catch(async (error) => {
    console.error('启动应用失败:', error)
    await app.stop()
    process.exit(1)
  })
}

// 如果直接运行此文件，则启动应用
if (require.main === module) {
  main()
}
