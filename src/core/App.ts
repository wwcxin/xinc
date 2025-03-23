import { NCWebsocketApi } from '../napcat/NCWebsocketApi'
import { Logger, LogLevel } from './Logger'
import { Config, loadConfig } from './config'
import { PluginManager } from './plugin/PluginManager'
import { Structs } from '../napcat/Structs'
import { join } from 'path'
import fs from 'fs'
const packageInfo = require('../../package.json');

export class App {
  private ws!: NCWebsocketApi
  private logger!: Logger
  private config!: Config
  private pluginManager!: PluginManager

  constructor(configPath: string = 'xinc.config.toml') {
    // 初始化将在 init 方法中完成
  }

  public async init(configPath: string = 'xinc.config.toml'): Promise<void> {
    try {
      // 加载配置文件
      this.config = await loadConfig(configPath)
      
      // 初始化日志系统
      this.logger = new Logger(this.config.logger)
      this.logger.info('配置加载成功')
      
      // 初始化WebSocket连接
      this.ws = new NCWebsocketApi({
        host: this.config.host,
        port: this.config.port,
        protocol: 'ws'
      })

      this.setupEventHandlers()
      this.logger.info('事件处理器设置完成')
      
      // 初始化插件管理器，传入已启用的插件列表
      this.pluginManager = new PluginManager(this.ws, this.logger, 'plugins', this.config.plugins)
      this.logger.info('插件管理器初始化完成')
      
      // 注册内置管理插件
      this.registerBuiltinAdminPlugin()
      this.logger.info('内置管理插件注册完成')
    } catch (error) {
      console.error('初始化失败:', error)
      process.exit(1)
    }
  }

  

  // 注册内置管理插件
  private registerBuiltinAdminPlugin(): void {
    // 创建一个内部插件上下文
    const ctx = {
      napcat: this.ws,
      logger: this.logger,
      handle: this.pluginManager['createContext']('内置管理插件').handle
    }

    // 处理管理命令
    ctx.handle('message', async (e) => {
      // 检查是否是框架主人或管理员
      const isRoot = this.config.root.includes(e.user_id)
      const isAdmin = this.config.admins.includes(e.user_id) || this.config.root.includes(e.user_id)
      
      if (!isRoot && !isAdmin) return
      
      const prefix = this.config.prefix
      const message = e.raw_message.trim()
      
      if (!message.startsWith(prefix)) return
      
      const cmd = message.substring(prefix.length).trim()
      
      // 退出命令
      if (cmd === `退出` || cmd === `exit`) {
        // 仅允许主人执行
        if (!isRoot) {
          e.reply('只有框架主人才能执行此命令');
          return;
        }
        
        // 发送退出消息
        e.reply('正在关闭框架，再见...');
        
        // 延迟一小段时间确保消息能发送出去
        setTimeout(async () => {
          this.logger.info(`收到来自用户 ${e.user_id} 的关闭命令，正在关闭框架...`);
          await this.stop();
          process.exit(0); // 确保完全退出
        }, 1000);
        
        return;
      }

      // 帮助命令
      if (cmd === `帮助` || cmd === `help`) {
        const helpMsg = [
          Structs.text(`〓 Xinc 帮助 〓\n`),
          Structs.text(`命令列表:\n`),
          Structs.text(`${prefix}状态 - 查看框架状态\n`),
          Structs.text(`${prefix}插件 列表 - 查看插件列表\n`),
          Structs.text(`${prefix}插件 重载 <插件名> - 重载指定插件\n`),
          Structs.text(`${prefix}插件 启用 <插件名> - 启用指定插件\n`),
          Structs.text(`${prefix}插件 禁用 <插件名> - 禁用指定插件\n`)
        ]
        
        if (isRoot) {
          helpMsg.push(Structs.text(`${prefix}设置 加管理 <QQ> - 添加框架管理员\n`))
          helpMsg.push(Structs.text(`${prefix}设置 删管理 <QQ> - 删除框架管理员\n`))
          helpMsg.push(Structs.text(`${prefix}设置 加主人 <QQ> - 添加框架主人\n`))
          helpMsg.push(Structs.text(`${prefix}设置 删主人 <QQ> - 删除框架主人\n`))
          helpMsg.push(Structs.text(`${prefix}设置 前缀 <前缀> - 修改命令前缀\n`))
          helpMsg.push(Structs.text(`${prefix}设置 日志 <级别> - 修改日志级别\n`))
          helpMsg.push(Structs.text(`${prefix}退出 - 退出框架\n`))
        }
        
        e.reply(helpMsg)
        return
      }
      
      // 框架状态
      if (cmd === `状态` || cmd === `status`) {
        // 获取系统信息
        const os = require('os');
        const uptime = process.uptime();
        const uptimeStr = formatUptime(uptime);
        
        // 计算内存使用情况
        const totalMem = os.totalmem() / 1024 / 1024 / 1024;
        const freeMem = os.freemem() / 1024 / 1024 / 1024;
        const usedMem = totalMem - freeMem;
        const memPercent = (usedMem / totalMem * 100).toFixed(1);
        
        // 获取机器人信息
        const botInfo = await this.ws.get_login_info();
        const groups = await this.ws.get_group_list();
        const friends = await this.ws.get_friend_list();
        
        // 获取插件统计
        const allPlugins = this.pluginManager.getAllPlugins();
        const userPlugins = allPlugins.filter(p => p.type === 'user');
        const enabledPlugins = userPlugins.filter(p => p.enabled);
        
        // CPU信息
        const cpu = os.cpus()[0].model;
        
        const statusMsg = [
          Structs.text(`〓 Xinc 状态 〓\n`),
          Structs.text(`昵称: ${botInfo.nickname}\n`),
          Structs.text(`账号: ${botInfo.user_id}\n`),
          Structs.text(`社交: ${groups.length} 个群, ${friends.length} 个好友\n`),
          Structs.text(`插件: ${enabledPlugins.length} 个启用, 共 ${userPlugins.length} 个\n`),
          Structs.text(`运行时间: ${uptimeStr}\n`),
          Structs.text(`环境: XincBot.v${packageInfo.version}-Node${process.version.slice(1)}\n`),
          Structs.text(`处理器: ${cpu}\n`),
          Structs.text(`内存: ${usedMem.toFixed(1)}GB/${totalMem.toFixed(1)}GB (${memPercent}%)`)
        ];
        
        e.reply(statusMsg);
        return;
      }
      
      // 插件管理命令
      if (cmd.startsWith('插件 ') || cmd.startsWith('p ')) {
        const args = cmd.split(' ').slice(1)
        const subCmd = args[0]
        const pluginName = args.slice(1).join(' ')
        
        // 插件列表
        if (subCmd === '列表' || subCmd === 'ls') {
          const allPlugins = this.pluginManager.getAllPlugins();
          const userPlugins = allPlugins.filter(p => p.type === 'user');
          
          // 使用新的格式显示插件列表
          let msg = [Structs.text(`〓 插件列表 〓\n`)];
          
          if (userPlugins.length === 0) {
            msg.push(Structs.text(`暂无插件\n`));
          } else {
            // 添加用户插件列表
            userPlugins.forEach(plugin => {
              const status = plugin.enabled ? '🟢' : '🔴';
              msg.push(Structs.text(`${status} ${plugin.name}\n`));
            });
          }
          
          // 添加统计信息
          const enabledCount = userPlugins.filter(p => p.enabled).length;
          msg.push(Structs.text(`共 ${userPlugins.length} 个，启用 ${enabledCount} 个`));
          
          e.reply(msg);
          return;
        }
        
        // 重载插件
        if (subCmd === '重载' || subCmd === 'reload') {
          if (!pluginName) {
            e.reply('请指定要重载的插件名称')
            return
          }
          
          const result = await this.pluginManager.reloadPlugin(pluginName)
          
          if (result) {
            e.reply(`已重载插件 ${pluginName}`)
          } else {
            e.reply(`重载插件 ${pluginName} 失败，请检查日志`)
          }
          return
        }
        
        // 启用插件
        if (subCmd === '启用' || subCmd === 'on') {
          if (!pluginName) {
            e.reply('请指定要启用的插件名称')
            return
          }
          
          // 检查插件是否已经启用
          if (this.config.plugins.includes(pluginName)) {
            e.reply(`插件 ${pluginName} 已经处于启用状态`)
            return
          }
          
          const result = await this.pluginManager.enablePlugin(pluginName)
          
          if (result) {
            this.updatePlugins('add', pluginName)
            e.reply(`已启用插件 ${pluginName}`)
          } else {
            e.reply(`启用插件 ${pluginName} 失败，请检查日志`)
          }
          return
        }
        
        // 禁用插件
        if (subCmd === '禁用' || subCmd === 'off') {
          if (!pluginName) {
            e.reply('请指定要禁用的插件名称')
            return
          }
          
          // 检查插件是否已经禁用
          if (!this.config.plugins.includes(pluginName)) {
            e.reply(`插件 ${pluginName} 已经处于禁用状态`)
            return
          }
          
          // 检查是否为内置插件
          const allPlugins = this.pluginManager.getAllPlugins()
          const targetPlugin = allPlugins.find(p => p.name === pluginName)
          if (targetPlugin && targetPlugin.type === 'builtin') {
            e.reply(`无法禁用内置插件 ${pluginName}`)
            return
          }
          
          const result = await this.pluginManager.disablePlugin(pluginName)
          
          if (result) {
            this.updatePlugins('remove', pluginName)
            e.reply(`已禁用插件 ${pluginName}`)
          } else {
            e.reply(`禁用插件 ${pluginName} 失败，请检查日志`)
          }
          return
        }
        
        e.reply(`未知的插件命令: ${subCmd}，请使用 ${prefix}帮助 查看可用命令`)
        return
      }
      
      // 设置命令
      if (cmd.startsWith('设置 ') || cmd.startsWith('set ')) {
        const args = cmd.split(' ').slice(1)
        const subCmd = args[0]
        const value = args.slice(1).join(' ')
        
        if (!isRoot) {
          e.reply('只有框架主人可以修改设置')
          return
        }
        
        // 添加管理员
        if (subCmd === '加管理') {
          const qq = getAtUserID(e)
          
          if (!qq) {
            e.reply('无效的QQ号')
            return
          }
          
          if (this.config.root.includes(qq)) {
            e.reply('该用户已经是框架主人')
            return
          }
          
          if (this.config.admins.includes(qq)) {
            e.reply('该用户已经是框架管理员')
            return
          }
          
          // 添加管理员
          this.config.admins.push(qq)
          this.saveConfig()
          
          e.reply(`已将 ${qq} 添加为框架管理员`)
          return
        }
        
        // 删除管理员
        if (subCmd === '删管理') {
          const qq = getAtUserID(e)
          
          if (!qq) {
            e.reply('无效的QQ号')
            return
          }
          
          const index = this.config.admins.indexOf(qq)
          if (index === -1) {
            e.reply('该用户不是框架管理员')
            return
          }
          
          // 删除管理员
          this.config.admins.splice(index, 1)
          this.saveConfig()
          
          e.reply(`已将 ${qq} 从框架管理员中移除`)
          return
        }
        
        // 添加主人
        if (subCmd === '加主人') {
          const qq = getAtUserID(e)
          
          if (!qq) {
            e.reply('无效的QQ号')
            return
          }
          
          if (this.config.root.includes(qq)) {
            e.reply('该用户已经是框架主人')
            return
          }
          
          // 添加主人
          this.config.root.push(qq)
          this.saveConfig()
          
          e.reply(`已将 ${qq} 添加为框架主人`)
          return
        }
        
        // 删除主人
        if (subCmd === '删主人') {
          const qq = getAtUserID(e)
          
          if (!qq) {
            e.reply('无效的QQ号')
            return
          }
          
          if (qq === e.user_id) {
            e.reply('不能删除自己的主人权限')
            return
          }
          
          const index = this.config.root.indexOf(qq)
          if (index === -1) {
            e.reply('该用户不是框架主人')
            return
          }
          
          // 删除主人
          this.config.root.splice(index, 1)
          this.saveConfig()
          
          e.reply(`已将 ${qq} 从框架主人中移除`)
          return
        }
        
        // 修改前缀
        if (subCmd === '前缀') {
          if (!value) {
            e.reply('前缀不能为空')
            return
          }
          
          // 修改前缀
          this.config.prefix = value
          this.saveConfig()
          
          e.reply(`已将命令前缀修改为 ${value}`)
          return
        }
        
        // 修改日志级别
        if (subCmd === '日志') {
          if (!['debug', 'info', 'warn', 'error', 'silent'].includes(value)) {
            e.reply('无效的日志级别，可选值: debug, info, warn, error, silent')
            return
          }
          
          // 修改日志级别
          this.config.logger = value as LogLevel
          this.saveConfig()
          
          e.reply(`已将日志级别修改为 ${value}`)
          return
        }
        
        e.reply(`未知的设置命令: ${subCmd}，请使用 ${prefix}帮助 查看可用命令`)
        return
      }

      
    })
  }
  
  // 保存配置
  private saveConfig(): void {
    try {
      const configPath = 'xinc.config.toml'
      const fullPath = join(process.cwd(), configPath)
      
      // 创建 TOML 内容，确保插件名称被正确引号包裹
      const tomlContent = `host = "${this.config.host}"
port = ${this.config.port}
prefix = "${this.config.prefix}"
root = [${this.config.root.join(', ')}]
admins = [${this.config.admins.join(', ')}]
plugins = [${this.config.plugins.map(p => `"${p}"`).join(', ')}]
logger = "${this.config.logger}"
`
      
      fs.writeFileSync(fullPath, tomlContent)
      this.logger.info(`配置已保存，已启用插件: ${this.config.plugins.length > 0 ? this.config.plugins.join(', ') : '无'}`)
    } catch (error) {
      this.logger.error('保存配置失败:', error)
    }
  }

  private setupEventHandlers(): void {
    // WebSocket连接事件
    this.ws.on('socket.connecting', (data) => {
      this.logger.info('正在连接WebSocket...')
    })

    this.ws.on('socket.open', () => {
      this.logger.info('WebSocket连接成功')
    })

    this.ws.on('socket.close', (data) => {
      this.logger.warn(`WebSocket断开连接(代码: ${data.code})，原因: ${data.reason || '未知'}，尝试重连...`)
    })

    this.ws.on('socket.error', (error) => {
      this.logger.error('WebSocket错误:', error)
    })

    // API相关事件
    this.ws.on('api.preSend', (data) => {
      this.logger.debug('发送API请求:', data.action, data.params)
    })

    this.ws.on('api.response.success', (data) => {
      this.logger.debug('API请求成功:', data.echo, data.data)
    })

    this.ws.on('api.response.failure', (data) => {
      this.logger.warn('API请求失败:', data.echo, data.message)
    })

    // 消息处理
    this.ws.on('message', (message) => {
      this.logger.debug('收到消息:', message)
    })

    // 群消息
    this.ws.on('message.group', (message) => {
      this.logger.info(`收到群消息 [${message.group_id}] ${message.sender.nickname}: ${JSON.stringify(message.raw_message)}`)
    })

    // 私聊消息
    this.ws.on('message.private', (message) => {
      this.logger.info(`收到私聊消息 [${message.user_id}] ${message.sender.nickname}: ${JSON.stringify(message.raw_message)}`)
    })

    // 通知事件
    this.ws.on('notice', (notice) => {
      this.logger.info('收到通知:', notice.notice_type, notice)
    })

    // 请求事件
    this.ws.on('request', (request) => {
      this.logger.info('收到请求:', request.request_type, request)
    })
  }

  public async start(): Promise<void> {
    try {
      this.logger.info('启动 Xinc 机器人...')
      await this.ws.connect()
      this.logger.info(`机器人运行在 ${this.config.host}:${this.config.port}`)
      
      // 加载插件
      await this.pluginManager.loadAllPlugins()
    } catch (error) {
      this.logger.error('启动机器人失败:', error)
      process.exit(1)
    }
  }

  public async stop(): Promise<void> {
    try {
      this.logger.info('停止 Xinc 机器人...')
      await this.ws.disconnect()
      this.logger.info('机器人已成功停止')
      
      // 关闭日志流
      await this.logger.close()
    } catch (error) {
      this.logger.error('停止机器人时出错:', error)
      // 确保日志流关闭
      await this.logger.close()
      process.exit(1)
    }
  }

  // 更新插件列表
  private updatePlugins(action: 'add' | 'remove', pluginName: string): void {
    try {
      if (action === 'add') {
        if (!this.config.plugins.includes(pluginName)) {
          this.config.plugins.push(pluginName);
          this.logger.info(`插件 ${pluginName} 已添加到配置中`);
        }
      } else {
        const index = this.config.plugins.indexOf(pluginName);
        if (index !== -1) {
          this.config.plugins.splice(index, 1);
          this.logger.info(`插件 ${pluginName} 已从配置中移除`);
        }
      }
      this.saveConfig();
    } catch (error) {
      this.logger.error(`更新插件配置失败: ${error}`);
    }
  }
} 

// 添加一个格式化运行时间的辅助函数
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days}天${hours}小时${minutes}分${secs}秒`;
}

function getAtUserID(e: any) {
  if (!e || !e.message) return null;
  
  for (const segment of e.message) {
    if (segment.type === 'at' && segment.data && segment.data.qq) {
      return parseInt(segment.data.qq);
    }
  }
  return null;
}