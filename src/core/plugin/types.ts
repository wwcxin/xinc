import type { NCWebsocketApi } from '../../napcat/NCWebsocketApi'
import type { AllHandlers, EventHandleMap, EventKey } from '../../napcat/Interfaces'
import type { Logger } from '../Logger'

/** 群组信息接口 */
export interface GroupInfo {
  /** 群号 */
  group_id: number;
  /** 群名称 */
  group_name: string;
  /** 当前成员数 */
  member_count: number;
  /** 最大成员数 */
  max_member_count: number;
}

/** 群成员信息接口 */
export interface GroupMemberInfo {
  /** 群号 */
  group_id: number;
  /** QQ号 */
  user_id: number;
  /** 昵称 */
  nickname: string;
  /** 群名片 */
  card: string;
  /** 角色: 群主、管理员、普通成员 */
  role: 'owner' | 'admin' | 'member';
  /** 专属头衔 */
  title: string;
  /** 加群时间(时间戳) */
  join_time: number;
  /** 最后发言时间(时间戳) */
  last_sent_time: number;
}

/** Cookie信息接口 */
export interface CookieInfo {
  /** Cookies字符串 */
  cookies: string;
  /** bkn/gtk值 */
  bkn: string;
}

/** 登录凭证信息接口 */
export interface CredentialsInfo {
  /** Cookies字符串 */
  cookies: string;
  /** CSRF Token */
  token: string;
}

/** 版本信息接口 */
export interface VersionInfo {
  /** 应用标识 */
  app_name: string;
  /** 应用版本 */
  app_version: string;
  /** 协议版本 */
  protocol_version: string;
}

/** 插件上下文类型 */
export interface PluginContext {
  /** 事件处理 */
  handle: <T extends EventKey>(event: T, handler: EventHandleMap[T]) => void
  
  /** Napcat API 实例 */
  napcat: NCWebsocketApi
  
  /** 日志实例 */
  logger: Logger

  /** 获取QQ头像URL */
  getAvatarURL: (qq: number) => string
  
  /** 获取群头像URL */
  getGroupAvatarURL: (group_id: number) => string
  
  /** 获取被引用的消息详细 */
  getQuoteMessage: (e: any) => Promise<any>

  /**
   * 获取消息文本内容
   */
  getText: (e: any) => string
  
  /** 获取消息中的图片URL */
  getImageURL: (e: any) => string | null
  
  /** 获取消息中提及到的图片URL（消息或被引用消息中的图片） */
  getQuoteImageURL: (e: any) => Promise<any>
  
  /** 获取消息中@的用户QQ号 */
  getAtUserID: (e: any) => number | null
  
  /** 判断是否是主人 */
  isRoot: (e: any) => Promise<boolean>
  
  /** 判断是否是管理员 */
  isAdmin: (e: any) => Promise<boolean>
  
  /** 判断是否是群主或管理员 */
  isGroupAdmin: (e: any) => boolean
  
  // reply: (e: any, message: string | any[], quote?: boolean) => Promise<{ message_id: number }>
  
  /** 发送私聊消息 */
  sendPrivateMsg: (user_id: number, message: string | any[]) => Promise<{ message_id: number }>
  
  /** 发送群聊消息 */
  sendGroupMsg: (group_id: number, message: string | any[]) => Promise<{ message_id: number }>
  
  /** 撤回消息 */
  deleteMsg: (message_id: number) => Promise<void>
  
  /** 获取群信息 */
  getGroupInfo: (group_id: number) => Promise<GroupInfo>
  
  /** 获取群成员信息 */
  getGroupMemberInfo: (group_id: number, user_id: number, no_cache?: boolean) => Promise<GroupMemberInfo>
  
  /** 获取群成员列表 */
  getGroupMemberList: (group_id: number) => Promise<GroupMemberInfo[]>
  
  /** 获取群列表 */
  getGroupList: () => Promise<GroupInfo[]>
  
  /** 设置群名片 */
  setGroupCard: (group_id: number, user_id: number, card: string) => Promise<void>
  
  /** 设置群管理员 */
  setGroupAdmin: (group_id: number, user_id: number, enable?: boolean) => Promise<void>
  
  /** 群禁言 */
  setGroupBan: (group_id: number, user_id: number, duration?: number) => Promise<void>
  
  /** 全员禁言 */
  setGroupWholeBan: (group_id: number, enable?: boolean) => Promise<void>
  
  /** 踢出群成员 */
  setGroupKick: (group_id: number, user_id: number, reject_add_request?: boolean) => Promise<void>
  
  /** 退出群组 */
  setGroupLeave: (group_id: number, is_dismiss?: boolean) => Promise<void>
  
  /** 设置群名 */
  setGroupName: (group_id: number, group_name: string) => Promise<void>
  
  /** 设置专属头衔 */
  setTitle: (group_id: number, user_id: number, special_title: string, duration?: number) => Promise<void>
  
  /** 发送好友赞 */
  sendLike: (user_id: number, times?: number) => Promise<void>
  
  /** 获取版本信息 */
  getVersionInfo: () => Promise<VersionInfo>

  /** 设置QQ个性签名 */
  setSignature: (signature: string) => Promise<void>

  /** 设置QQ性别 */
  setSex: (sex: number) => Promise<void>

  /** 判断bot是否是群主 */
  botIsGroupOwner: (e: any) => Promise<boolean>

  /** 判断bot是否是群管理员 */
  botIsGroupAdmin: (e: any) => Promise<boolean>
}

/** 插件元数据 */
export interface PluginMeta {
  name: string
  version: string
  desc: string
}

/** 插件定义 */
export interface Plugin extends PluginMeta {
  setup: (ctx: PluginContext) => void | Promise<void>
}

/** 插件定义函数 */
export type DefinePlugin = (plugin: Plugin) => Plugin 