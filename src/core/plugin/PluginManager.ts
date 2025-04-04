import fs from 'fs'
import path from 'path'
import { NCWebsocketApi } from '../../napcat/NCWebsocketApi'
import { EventKey, MessageHandler } from '../../napcat/Interfaces'
import { Logger } from '../Logger'
import { DefinePlugin, Plugin, PluginContext } from './types'
import { Structs } from '../../napcat/Structs'
import { loadConfig } from '../config'

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private builtinPlugins: Map<string, Plugin> = new Map() // 内置插件单独存储
  private handlers: Map<string, Set<Function>> = new Map()
  private handlersByPlugin: Map<string, Set<Function>> = new Map() // 跟踪每个插件的处理器
  private api: NCWebsocketApi
  private logger: Logger
  private pluginsDir: string
  private enabledPlugins: string[] = [] // 已启用的插件列表

  constructor(api: NCWebsocketApi, logger: Logger, pluginsDir: string = 'plugins', enabledPlugins: string[] = []) {
    this.api = api
    this.logger = logger
    this.pluginsDir = path.join(process.cwd(), pluginsDir)
    this.enabledPlugins = enabledPlugins
    
    // 确保插件目录存在
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true })
    }
    
    // 设置事件处理
    this.setupEventHandlers()
  }

  // 设置事件处理
  private setupEventHandlers() {
    // 处理私聊消息
    this.api.on('message.private', (event) => {
      // 增强事件对象
      const enhancedEvent = this.enhanceMessageEvent(event)
      this.triggerHandlers('message.private', enhancedEvent)
      this.triggerHandlers('message', enhancedEvent)
    })
    
    // 处理群聊消息
    this.api.on('message.group', (event) => {
      // 增强事件对象
      const enhancedEvent = this.enhanceMessageEvent(event)
      this.triggerHandlers('message.group', enhancedEvent)
      this.triggerHandlers('message', enhancedEvent)
    })
    
    // 其他事件直接转发
    const events = [
      'notice', 'request', 'meta_event',
      'notice.notify.poke', 'notice.notify.lucky_king',
      'notice.group.increase', 'notice.group.decrease',
      'notice.group.admin', 'notice.group.ban',
      'notice.friend.add', 'request.friend', 'request.group'
    ]
    
    for (const event of events) {
      this.api.on(event as any, (data: any) => {
        this.triggerHandlers(event, data)
      })
    }
  }

  // 增强消息事件对象
  private enhanceMessageEvent(event: any) {
    return {
      ...event,
      // 回复消息
      reply: async (message: string | any[], quote: boolean = false) => {
        // 处理消息格式
        let msgArray: any[] = [];
        
        // 如果是字符串，转换为文本消息数组
        if (typeof message === 'string') {
          msgArray = [Structs.text(message)];
        } 
        // 如果是数组，处理数组中的每个元素
        else if (Array.isArray(message)) {
          msgArray = message.map(item => {
            if (typeof item === 'string') {
              return Structs.text(item);
            }
            return item;
          });
        }
        
        // 如果需要引用回复，添加回复消息
        if (quote && event.message_id) {
          msgArray.unshift(Structs.reply(event.message_id));
        }
        
        // 根据消息类型发送消息
        let result;
        if (event.message_type === 'private') {
          result = await this.api.send_private_msg({
            user_id: event.user_id,
            message: msgArray
          });
          
          // 使用 raw_message 记录日志
          const rawContent = typeof message === 'string' ? message : this.extractRawMessage(msgArray);
          this.logger.info(`发送私聊消息 [${event.user_id}] : ${rawContent}`);
        } else if (event.message_type === 'group') {
          result = await this.api.send_group_msg({
            group_id: event.group_id,
            message: msgArray
          });
          
          // 使用 raw_message 记录日志
          const rawContent = typeof message === 'string' ? message : this.extractRawMessage(msgArray);
          this.logger.info(`发送群消息 [${event.group_id}] : ${rawContent}`);
        }
        
        return result;
      }
    };
  }

  // 添加一个辅助方法来提取消息数组中的原始文本
  private extractRawMessage(msgArray: any[]): string {
    return msgArray.map(item => {
      if (item.type === 'text') {
        return item.data.text;
      } else if (item.type === 'image') {
        return '[图片]';
      } else if (item.type === 'face') {
        return '[表情]';
      } else if (item.type === 'at') {
        return `@${item.data.qq}`;
      } else if (item.type === 'reply') {
        return '[回复]';
      } else {
        return `[${item.type}]`;
      }
    }).join('');
  }

  // 触发事件处理器
  private triggerHandlers(event: string, data: any) {
    const handlers = this.handlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data)
        } catch (error) {
          this.logger.error(`插件事件处理错误 [${event}]:`, error)
        }
      }
    }
  }

  // 创建插件上下文
  private createContext(pluginName: string): PluginContext {
    return {
      napcat: this.api,
      logger: this.logger,
      handle: (event, handler) => {
        if (!this.handlers.has(event)) {
          this.handlers.set(event, new Set())
        }
        
        const handlers = this.handlers.get(event)!
        handlers.add(handler)
        
        // 跟踪这个插件的处理器
        if (!this.handlersByPlugin.has(pluginName)) {
          this.handlersByPlugin.set(pluginName, new Set())
        }
        const pluginHandlers = this.handlersByPlugin.get(pluginName)!
        pluginHandlers.add(handler)
        
        this.logger.debug(`插件 [${pluginName}] 注册事件处理器: ${event}`)
        
        // 返回取消注册的函数
        return () => {
          handlers.delete(handler)
          if (pluginHandlers) {
            pluginHandlers.delete(handler)
          }
          this.logger.debug(`插件 [${pluginName}] 取消注册事件处理器: ${event}`)
        }
      },

      // 新增: 获取QQ头像URL
      getAvatarURL: (qq: number) => {
        return `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=640`;
      },
      
      // 新增: 获取群头像URL
      getGroupAvatarURL: (group_id: number) => {
        return `https://p.qlogo.cn/gh/${group_id}/${group_id}/640/`;
      },
      
      // 获取被引用的消息详细
      getQuoteMessage: async (e: any) => {
        if (!e || !e.message) return null;
        try {
          const reply = e.message.find((msg: any) => msg.type === 'reply');
          if (!reply) return null;
          const msg = await this.api.get_msg({ message_id: reply.data.id });
          return msg;
        } catch (error) {
          return null;
        }
      },

      // 新增: 获取消息文本内容
      getText: (e: any) => {
        // 处理消息数组
        if (Array.isArray(e.message)) {
          const text = e.message
              .filter((msg: any) => msg.type === 'text')
              .map((msg: any) => msg.data.text)
              .join('');
          return text.trim();
      }
      return '';
      },
      
      // 新增: 获取消息中的图片URL
      getImageURL: (e: any) => {
        if (!e || !e.message) return null;
        
        for (const segment of e.message) {
          if (segment.type === 'image' && segment.data && segment.data.url) {
            return segment.data.url;
          }
        }
        return null;
      },

      // 新增: 获取消息中提及到的图片URL（消息或被引用消息中的图片）
      getQuoteImageURL: async (e: any) => {
        if (!e || !e.message) return null;
        try {
          const reply = e.message.find((msg: any) => msg.type === 'reply');
          if (!reply) return null;
          const msg = await this.api.get_msg({ message_id: reply.data.id });

          for (const segment of msg.message) {
            if (segment.type === 'image' && segment.data && segment.data.url) {
              return segment.data.url;
            }
          }
        } catch {
          for (const segment of e.message) {
            if (segment.type === 'image' && segment.data && segment.data.url) {
              return segment.data.url;
            }
          }
        }
        return null;
      },
      
      // 新增: 获取消息中@的用户QQ号
      getAtUserID: (e: any) => {
        if (!e || !e.message) return null;
        
        for (const segment of e.message) {
          if (segment.type === 'at' && segment.data && segment.data.qq) {
            return parseInt(segment.data.qq);
          }
        }
        return null;
      },
      
      // 新增: 判断是否是主人
      isRoot: async (e: any) => {
        const config = await loadConfig();
        return config.root.includes(e.user_id);
      },
      
      // 新增: 判断是否是管理员
      isAdmin: async (e: any) => {
        const config = await loadConfig();
        return config.admins.includes(e.user_id) || config.root.includes(e.user_id);
      },
      
      // 新增: 判断是否是群主或管理员
      isGroupAdmin: (e: any) => {
        if (!e || !e.sender || !e.sender.role) return false;
        return e.sender.role === 'owner' || e.sender.role === 'admin';
      },
      
      // 新增: 发送私聊消息
      sendPrivateMsg: async (user_id: number, message: string | any[]) => {
        let msgArray = Array.isArray(message) ? message : [{ type: 'text', data: { text: message } }];
        
        // 如果传入的是字符串数组，转换成文本消息数组
        msgArray = msgArray.map(item => {
          if (typeof item === 'string') {
            return { type: 'text', data: { text: item } };
          }
          return item;
        });
        
        const result = await this.api.send_private_msg({
          user_id: user_id,
          message: msgArray
        });
        
        const rawContent = typeof message === 'string' ? message : this.extractRawMessage(msgArray);
        this.logger.info(`发送私聊消息 [${user_id}] : ${rawContent}`);
        
        return result;
      },
      
      // 新增: 发送群聊消息
      sendGroupMsg: async (group_id: number, message: string | any[]) => {
        let msgArray = Array.isArray(message) ? message : [{ type: 'text', data: { text: message } }];
        
        // 如果传入的是字符串数组，转换成文本消息数组
        msgArray = msgArray.map(item => {
          if (typeof item === 'string') {
            return { type: 'text', data: { text: item } };
          }
          return item;
        });
        
        const result = await this.api.send_group_msg({
          group_id: group_id,
          message: msgArray
        });
        
        const rawContent = typeof message === 'string' ? message : this.extractRawMessage(msgArray);
        this.logger.info(`发送群消息 [${group_id}] : ${rawContent}`);
        
        return result;
      },
      
      // 新增: 撤回消息
      deleteMsg: async (message_id: number) => {
        await this.api.delete_msg({
          message_id: message_id
        });
      },
      
      // 新增: 获取群信息
      getGroupInfo: async (group_id: number) => {
        const result = await this.api.get_group_info({
          group_id: group_id
        });
        return result;
      },
      
      // 新增: 获取群成员信息
      getGroupMemberInfo: async (group_id: number, user_id: number, no_cache: boolean = false) => {
        const result = await this.api.get_group_member_info({
          group_id: group_id,
          user_id: user_id,
          no_cache: no_cache
        });
        return result;
      },
      
      // 新增: 获取群成员列表
      getGroupMemberList: async (group_id: number) => {
        const result = await this.api.get_group_member_list({
          "group_id": group_id
        });
        
        // 将API返回的数据转换为正确的GroupMemberInfo类型
        return result.map((member: any) => ({
          group_id: member.group_id,
          user_id: member.user_id,
          nickname: member.nickname,
          card: member.card,
          role: member.role,
          title: member.title,
          join_time: member.join_time,
          last_sent_time: member.last_sent_time
        }));
      },
      
      // 新增: 获取群列表
      getGroupList: async () => {
        const result = await this.api.get_group_list();
        return result;
      },
      
      // 新增: 设置群名片
      setGroupCard: async (group_id: number, user_id: number, card: string) => {
        await this.api.set_group_card({
          group_id: group_id,
          user_id: user_id,
          card: card
        });
      },
      
      // 新增: 设置群管理员
      setGroupAdmin: async (group_id: number, user_id: number, enable: boolean = true) => {
        await this.api.set_group_admin({
          group_id: group_id,
          user_id: user_id,
          enable: enable
        });
      },
      
      // 新增: 群禁言
      setGroupBan: async (group_id: number, user_id: number, duration: number = 1800) => {
        await this.api.set_group_ban({
          group_id: group_id,
          user_id: user_id,
          duration: duration
        });
      },
      
      // 新增: 全员禁言
      setGroupWholeBan: async (group_id: number, enable: boolean = true) => {
        await this.api.set_group_whole_ban({
          group_id: group_id,
          enable: enable
        });
      },
      
      // 新增: 踢出群成员
      setGroupKick: async (group_id: number, user_id: number, reject_add_request: boolean = false) => {
        await this.api.set_group_kick({
          group_id: group_id,
          user_id: user_id,
          reject_add_request: reject_add_request
        });
      },
      
      // 新增: 退出群组
      setGroupLeave: async (group_id: number, is_dismiss: boolean = false) => {
        await this.api.set_group_leave({
          group_id: group_id,
          is_dismiss: is_dismiss
        });
      },
      
      // 新增: 设置群名
      setGroupName: async (group_id: number, group_name: string) => {
        await this.api.set_group_name({
          group_id: group_id,
          group_name: group_name
        });
      },
      
      // 新增: 设置专属头衔
      setTitle: async (group_id: number, user_id: number, special_title: string) => {
        await this.api.set_group_special_title({
          group_id: group_id,
          user_id: user_id,
          special_title: special_title,
        });
      },
      
      // 新增: 发送好友赞
      sendLike: async (user_id: number, times: number = 50) => {
        // 使用call方法获取完整响应
        const result = await this.api.send_like({
          user_id: user_id,
          times: times
        });
        
        // 如果失败，日志记录错误信息
        if (result.retcode !== 0) {
          this.logger.warn(`发送好友赞失败: ${result.message}`);
        }
        
        return result; // 返回完整响应
      },
      
      // 新增: 获取版本信息
      getVersionInfo: async () => {
        const result = await this.api.get_version_info();
        return result;
      },

      // 新增: 设置qq个性签名
      setSignature: async (signature: string) => {
        await this.api.set_self_longnick({
          longNick: signature 
        });
      },

      // 新增: 设置QQ性别
      setSex: async (sex: number) => {
        const botInfo = await this.api.get_login_info();

        await this.api.set_qq_profile({
          nickname: botInfo.nickname,
          sex: sex
        });
      },
      
      // 新增: 判断bot是否是群主
      botIsGroupOwner: async (e: any) => {
        const botId = (await this.api.get_login_info()).user_id;
        const result = await this.api.get_group_member_info({
          group_id: e.group_id,
          user_id: botId,
          no_cache: false
        });
        return result.role === 'owner';
      },

      // 新增: 判断bot是否是群管理员
      botIsGroupAdmin: async (e: any) => {
        const botId = (await this.api.get_login_info()).user_id;
        const result = await this.api.get_group_member_info({
          group_id: e.group_id,
          user_id: botId,
          no_cache: false
        });
        return result.role === 'admin' || result.role === 'owner';
      },

    }
  }

  // 加载单个插件
  async loadPlugin(pluginPath: string, isBuiltin: boolean = false): Promise<boolean> {
    try {
      // 清除缓存以支持热重载
      const fullPath = require.resolve(pluginPath)
      delete require.cache[fullPath]
      
      // 导入插件
      const module = await import(fullPath)
      const plugin = module.default as Plugin
      
      if (!plugin || !plugin.name || !plugin.setup) {
        this.logger.error(`无效的插件: ${pluginPath}`)
        return false
      }
      
      // 如果不是内置插件，且不在已启用列表中，则跳过加载
      if (!isBuiltin && !this.enabledPlugins.includes(plugin.name)) {
        this.logger.debug(`跳过禁用的插件: ${plugin.name}`)
        return false
      }
      
      // 如果插件已加载，先卸载
      if (this.plugins.has(plugin.name) || this.builtinPlugins.has(plugin.name)) {
        await this.unloadPlugin(plugin.name)
      }
      
      // 创建插件上下文并设置插件
      const context = this.createContext(plugin.name)
      await Promise.resolve(plugin.setup(context))
      
      // 保存插件
      if (isBuiltin) {
        this.builtinPlugins.set(plugin.name, plugin)
        this.logger.info(`内置插件加载成功: ${plugin.name} v${plugin.version}`)
      } else {
        this.plugins.set(plugin.name, plugin)
        this.logger.info(`插件加载成功: ${plugin.name} v${plugin.version}`)
      }
      
      return true
    } catch (error) {
      this.logger.error(`加载插件失败: ${pluginPath}`, error)
      return false
    }
  }

  // 注册内置插件
  async registerBuiltinPlugin(plugin: Plugin): Promise<boolean> {
    try {
      // 如果插件已加载，先卸载
      if (this.builtinPlugins.has(plugin.name)) {
        await this.unloadPlugin(plugin.name, true)
      }
      
      // 创建插件上下文并设置插件
      const context = this.createContext(plugin.name)
      await Promise.resolve(plugin.setup(context))
      
      // 保存插件
      this.builtinPlugins.set(plugin.name, plugin)
      this.logger.debug(`内置插件注册成功: ${plugin.name} v${plugin.version}`)
      
      return true
    } catch (error) {
      this.logger.error(`注册内置插件失败: ${plugin.name}`, error)
      return false
    }
  }

  // 卸载插件
  async unloadPlugin(pluginName: string, isBuiltin: boolean = false): Promise<boolean> {
    // 根据是否为内置插件选择相应的Map
    const pluginMap = isBuiltin ? this.builtinPlugins : this.plugins
    const plugin = pluginMap.get(pluginName)
    
    if (!plugin) {
      this.logger.warn(`插件未加载: ${pluginName}`)
      return false
    }
    
    // 移除该插件的所有事件处理器
    const pluginHandlers = this.handlersByPlugin.get(pluginName)
    if (pluginHandlers) {
      for (const [event, handlers] of this.handlers.entries()) {
        for (const handler of pluginHandlers) {
          handlers.delete(handler)
        }
      }
      this.handlersByPlugin.delete(pluginName)
    }
    
    // 移除插件
    pluginMap.delete(pluginName)
    this.logger.info(`${isBuiltin ? '内置' : ''}插件卸载成功: ${pluginName}`)
    
    return true
  }

  // 加载目录中的所有启用的插件
  async loadAllPlugins(): Promise<void> {
    try {
      const pluginFolders = fs.readdirSync(this.pluginsDir)
      
      for (const folder of pluginFolders) {
        const pluginDir = path.join(this.pluginsDir, folder)
        const stat = fs.statSync(pluginDir)
        
        if (stat.isDirectory()) {
          const indexFile = path.join(pluginDir, 'index.ts')
          const indexJsFile = path.join(pluginDir, 'index.js')
          
          if (fs.existsSync(indexFile)) {
            await this.loadPlugin(indexFile)
          } else if (fs.existsSync(indexJsFile)) {
            await this.loadPlugin(indexJsFile)
          } else {
            this.logger.warn(`插件目录缺少入口文件: ${folder}`)
          }
        }
      }
      
      this.logger.info(`已加载 ${this.plugins.size} 个插件`)
    } catch (error) {
      this.logger.error('加载插件失败:', error)
    }
  }

  // 重新加载所有插件
  async reloadAllPlugins(): Promise<void> {
    // 保存当前加载的插件名称
    const pluginNames = [...this.plugins.keys()]
    
    // 卸载所有插件
    for (const name of pluginNames) {
      await this.unloadPlugin(name)
    }
    
    // 重新加载所有插件
    await this.loadAllPlugins()
  }
  
  // 重新加载单个插件
  async reloadPlugin(pluginName: string): Promise<boolean> {
    // 首先检查插件是否存在
    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      this.logger.warn(`无法重载未加载的插件: ${pluginName}`)
      return false
    }
    
    // 查找插件路径
    let pluginPath = null
    const pluginFolders = fs.readdirSync(this.pluginsDir)
    
    for (const folder of pluginFolders) {
      // 假设插件文件夹名称与插件名一致，或者包含插件名
      if (folder === pluginName || folder.toLowerCase() === pluginName.toLowerCase()) {
        const indexFile = path.join(this.pluginsDir, folder, 'index.ts')
        const indexJsFile = path.join(this.pluginsDir, folder, 'index.js')
        
        if (fs.existsSync(indexFile)) {
          pluginPath = indexFile
          break
        } else if (fs.existsSync(indexJsFile)) {
          pluginPath = indexJsFile
          break
        }
      }
    }
    
    if (!pluginPath) {
      this.logger.error(`找不到插件文件: ${pluginName}`)
      return false
    }
    
    // 卸载插件
    await this.unloadPlugin(pluginName)
    
    // 重新加载插件
    return await this.loadPlugin(pluginPath)
  }

  // 启用插件
  async enablePlugin(pluginName: string): Promise<boolean> {
    // 检查插件是否已启用
    if (this.enabledPlugins.includes(pluginName)) {
      this.logger.debug(`插件已启用: ${pluginName}`)
      return true
    }
    
    // 将插件添加到启用列表
    this.enabledPlugins.push(pluginName)
    
    // 如果插件尚未加载，尝试加载它
    if (!this.plugins.has(pluginName)) {
      let pluginPath = null
      const pluginFolders = fs.readdirSync(this.pluginsDir)
      
      for (const folder of pluginFolders) {
        if (folder === pluginName || folder.toLowerCase() === pluginName.toLowerCase()) {
          const indexFile = path.join(this.pluginsDir, folder, 'index.ts')
          const indexJsFile = path.join(this.pluginsDir, folder, 'index.js')
          
          if (fs.existsSync(indexFile)) {
            pluginPath = indexFile
            break
          } else if (fs.existsSync(indexJsFile)) {
            pluginPath = indexJsFile
            break
          }
        }
      }
      
      if (!pluginPath) {
        this.logger.error(`找不到插件文件: ${pluginName}`)
        return false
      }
      
      return await this.loadPlugin(pluginPath)
    }
    
    return true
  }
  
  // 禁用插件
  async disablePlugin(pluginName: string): Promise<boolean> {
    // 检查是否为内置插件
    if (this.builtinPlugins.has(pluginName)) {
      this.logger.warn(`无法禁用内置插件: ${pluginName}`)
      return false
    }
    
    // 检查插件是否已禁用
    const index = this.enabledPlugins.indexOf(pluginName)
    if (index === -1) {
      this.logger.debug(`插件已禁用: ${pluginName}`)
      
      // 确保插件被卸载
      if (this.plugins.has(pluginName)) {
        await this.unloadPlugin(pluginName)
      }
      
      return true
    }
    
    // 从启用列表中移除
    this.enabledPlugins.splice(index, 1)
    
    // 卸载插件
    return await this.unloadPlugin(pluginName)
  }

  // 获取已加载的插件列表
  getLoadedPlugins(): Plugin[] {
    return [...this.plugins.values()]
  }
  
  // 获取所有插件列表（包括内置插件）
  getAllPlugins(): { name: string; version: string; desc: string; type: 'user' | 'builtin'; enabled: boolean }[] {
    const pluginList: { name: string; version: string; desc: string; type: 'user' | 'builtin'; enabled: boolean }[] = []
    
    // 扫描插件目录获取所有可用插件
    try {
      const pluginFolders = fs.readdirSync(this.pluginsDir);
      
      // 处理所有插件目录
      for (const folder of pluginFolders) {
        const pluginDir = path.join(this.pluginsDir, folder);
        const stat = fs.statSync(pluginDir);
        
        if (stat.isDirectory()) {
          const indexFile = path.join(pluginDir, 'index.ts');
          const indexJsFile = path.join(pluginDir, 'index.js');
          
          let pluginInfo = null;
          
          // 首先检查已加载的插件
          if (this.plugins.has(folder)) {
            const plugin = this.plugins.get(folder)!;
            pluginInfo = {
              name: plugin.name,
              version: plugin.version,
              desc: plugin.desc,
              type: 'user' as const,
              enabled: true
            };
          } 
          // 如果没有加载但存在索引文件，尝试提取信息
          else if (fs.existsSync(indexFile) || fs.existsSync(indexJsFile)) {
            try {
              // 检查插件是否已启用
              const enabled = this.enabledPlugins.includes(folder);
              
              // 由于未加载，我们不读取版本和描述，只展示名称和状态
              pluginInfo = {
                name: folder,
                version: '未加载',
                desc: '在目录中但未加载',
                type: 'user' as const,
                enabled: enabled
              };
            } catch (error) {
              this.logger.debug(`读取插件信息失败: ${folder}`, error);
            }
          }
          
          if (pluginInfo) {
            pluginList.push(pluginInfo);
          }
        }
      }
    } catch (error) {
      this.logger.error('获取插件列表失败:', error);
    }
    
    // 添加内置插件
    for (const [name, plugin] of this.builtinPlugins.entries()) {
      pluginList.push({
        name: plugin.name,
        version: plugin.version,
        desc: plugin.desc,
        type: 'builtin' as const,
        enabled: true
      });
    }
    
    return pluginList;
  }
  
  // 获取启用的插件列表
  getEnabledPlugins(): string[] {
    return [...this.enabledPlugins]
  }
  
  // 设置启用的插件列表
  setEnabledPlugins(plugins: string[]): void {
    this.enabledPlugins = [...plugins]
  }
} 