import { Structs } from '../../napcat/Structs'
import { DefinePlugin, Plugin, PluginContext, GroupInfo, GroupMemberInfo, VersionInfo } from './types'
import { PluginManager } from './PluginManager'

// 插件定义函数
export const definePlugin: DefinePlugin = (plugin) => plugin

// 导出类型和管理器
export { Plugin, PluginManager, PluginContext, GroupInfo, GroupMemberInfo, VersionInfo }

// 导出结构体工具
export { Structs } 