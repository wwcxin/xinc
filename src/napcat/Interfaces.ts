import { Receive, Send } from './Structs.js'

export interface NCWebsocketOptionsBaseUrl {
  baseUrl: string
  accessToken?: string
  throwPromise?: boolean
  reconnection?: {
    enable?: boolean
    attempts?: number
    delay?: number
  }
}

export interface NCWebsocketOptionsHost {
  protocol: 'ws' | 'wss'
  host: string
  port: number
  accessToken?: string
  throwPromise?: boolean
  reconnection?: {
    enable?: boolean
    attempts?: number
    delay?: number
  }
}

export type NCWebsocketOptions = NCWebsocketOptionsBaseUrl | NCWebsocketOptionsHost

// =====================================================================================

export interface WSReconnection {
  enable: boolean
  attempts: number
  delay: number
  nowAttempts: number
}

export interface WSConnecting {
  reconnection: WSReconnection
}

export interface WSOpenRes {
  reconnection: WSReconnection
}

export interface WSCloseRes {
  code: number
  reason: string
  reconnection: WSReconnection
}

export type WSErrorRes = {
  reconnection: WSReconnection
} & (
  | {
      error_type: 'response_error'
      info: {
        errno: number
        message: string
        url: string
      }
    }
  | {
      error_type: 'connect_error'
      errors: ({
        errno: number
        code: string
        syscall: string
        address: string
        port: number
      } | null)[]
    }
)

export interface SocketHandler {
  'socket.connecting': WSConnecting
  'socket.open': WSOpenRes
  'socket.close': WSCloseRes
  'socket.error': WSErrorRes
  socket: SocketHandler['socket.connecting'] | SocketHandler['socket.open'] | SocketHandler['socket.close'] | SocketHandler['socket.error']
}

export interface APIRequest<T extends keyof WSSendParam> {
  action: T
  params: WSSendParam[T]
  echo: string
}

export interface APISuccessResponse<T extends keyof WSSendReturn> {
  status: 'ok'
  retcode: 0 // 返回码，0 为成功，非 0 为失败
  data: WSSendReturn[T]
  message: string // 信息
  wording: string
  echo: string
}

export interface APIErrorResponse {
  status: 'failed'
  retcode: 0
  data: null
  message: string // 信息
  wording: string
  echo: string
}

export interface ResponseHandler {
  onSuccess: (response: APISuccessResponse<keyof WSSendReturn>) => void
  onFailure: (reason: APIErrorResponse) => void
  message: APIRequest<keyof WSSendParam>
}

export interface ApiHandler {
  'api.preSend': APIRequest<keyof WSSendParam>
  'api.response': ApiHandler['api.response.success'] | ApiHandler['api.response.failure']
  'api.response.success': APISuccessResponse<keyof WSSendReturn>
  'api.response.failure': APIErrorResponse
  api: ApiHandler['api.preSend'] | ApiHandler['api.response']
}

// 心跳包
export interface HeartBeat {
  time: number
  self_id: number
  post_type: 'meta_event'
  meta_event_type: 'heartbeat'
  status: {
    online: boolean | undefined
    good: boolean
  }
  // 到下次的间隔
  interval: number
}

// 生命周期
export interface LifeCycleEnable {
  time: number
  self_id: number
  post_type: 'meta_event'
  meta_event_type: 'lifecycle'
  sub_type: 'enable'
}

export interface LifeCycleDisable {
  time: number
  self_id: number
  post_type: 'meta_event'
  meta_event_type: 'lifecycle'
  sub_type: 'disable'
}

export interface LifeCycleConnect {
  time: number
  self_id: number
  post_type: 'meta_event'
  meta_event_type: 'lifecycle'
  sub_type: 'connect'
}

export interface MetaEventHandler {
  'meta_event.lifecycle': MetaEventHandler['meta_event.lifecycle.enable'] | MetaEventHandler['meta_event.lifecycle.disable'] | MetaEventHandler['meta_event.lifecycle.connect']
  'meta_event.lifecycle.enable': LifeCycleEnable
  'meta_event.lifecycle.disable': LifeCycleDisable
  'meta_event.lifecycle.connect': LifeCycleConnect
  'meta_event.heartbeat': HeartBeat
  meta_event: MetaEventHandler['meta_event.lifecycle'] | MetaEventHandler['meta_event.heartbeat']
}

// =====================================================================================

export type MessageType = {
  message_format: 'array'
  message: Receive[keyof Receive][]
}

// 私聊消息
export type PrivateFriendMessage = {
  self_id: number
  user_id: number
  time: number
  message_id: number
  message_seq: number
  real_id: number
  message_type: 'private'
  sender: {
    user_id: number
    nickname: string
    card: string
  }
  raw_message: string
  font: number
  sub_type: 'friend'
  post_type: 'message'
  reply: (message: string | any[], quote?: boolean) => Promise<{ message_id: number }>
  quick_action?: (reply: any[]) => Promise<any>
} & MessageType

export type PrivateGroupMessage = {
  self_id: number
  user_id: number
  time: number
  message_id: number
  message_seq: number
  real_id: number
  message_type: 'private'
  sender: {
    user_id: number
    nickname: string
    card: string
  }
  raw_message: string
  font: number
  sub_type: 'group'
  post_type: 'message'
  reply: (message: string | any[], quote?: boolean) => Promise<{ message_id: number }>
  quick_action?: (reply: any[]) => Promise<any>
} & MessageType

// 群消息
export type GroupMessage = {
  self_id: number
  user_id: number
  time: number
  message_id: number
  message_seq: number
  real_id: number
  message_type: 'group'
  sender: {
    user_id: number
    nickname: string
    card: string
    role: 'owner' | 'admin' | 'member'
  }
  raw_message: string
  font: number
  sub_type: 'normal'
  post_type: 'message'
  group_id: number
  reply: (message: string | any[], quote?: boolean) => Promise<{ message_id: number }>
  quick_action?: (reply: any[], at_sender?: boolean) => Promise<any>
} & MessageType

export interface MessageHandler {
  'message.private': MessageHandler['message.private.friend'] | MessageHandler['message.private.group']
  'message.private.friend': PrivateFriendMessage
  'message.private.group': PrivateGroupMessage
  'message.group': MessageHandler['message.group.normal']
  'message.group.normal': GroupMessage
  message: MessageHandler['message.private'] | MessageHandler['message.group']
}

// =====================================================================================

export type PrivateFriendMessageSelf = {
  self_id: number
  user_id: number
  time: number
  message_id: number
  message_seq: number
  real_id: number
  message_type: 'private'
  sender: {
    user_id: number
    nickname: string
    card: string
  }
  raw_message: string
  font: number
  sub_type: 'friend'
  post_type: 'message_sent'
} & MessageType

export type PrivateGroupMessageSelf = {
  self_id: number
  user_id: number
  time: number
  message_id: number
  message_seq: number
  real_id: number
  message_type: 'private'
  sender: {
    user_id: number
    nickname: string
    card: string
  }
  raw_message: string
  font: number
  sub_type: 'group'
  post_type: 'message_sent'
} & MessageType

export type GroupMessageSelf = {
  self_id: number
  user_id: number
  time: number
  message_id: number
  message_seq: number
  real_id: number
  message_type: 'group'
  sender: {
    user_id: number
    nickname: string
    card: string
    role: 'owner' | 'admin' | 'member'
  }
  raw_message: string
  font: number
  sub_type: 'normal'
  post_type: 'message_sent'
  group_id: number
} & MessageType

export interface MessageSentHandler {
  'message_sent.private': MessageSentHandler['message_sent.private.friend'] | MessageSentHandler['message_sent.private.group']
  'message_sent.private.friend': PrivateFriendMessageSelf
  'message_sent.private.group': PrivateGroupMessageSelf
  'message_sent.group': MessageSentHandler['message_sent.group.normal']
  'message_sent.group.normal': GroupMessageSelf
  message_sent: MessageSentHandler['message_sent.private'] | MessageSentHandler['message_sent.group']
}

// =====================================================================================

// 加群请求／邀请
export interface RequestGroupAdd {
  time: number
  self_id: number
  post_type: 'request'
  group_id: number
  user_id: number
  request_type: 'group'
  comment: string
  flag: string
  sub_type: 'add'
  quick_action: (approve?: boolean, reason?: string) => Promise<null>
}

export interface RequestGroupInvite {
  time: number
  self_id: number
  post_type: 'request'
  group_id: number
  user_id: number
  request_type: 'group'
  comment: string
  flag: string
  sub_type: 'invite'
  quick_action: (approve?: boolean, reason?: string) => Promise<null>
}

// 加好友请求
export interface RequestFriend {
  time: number
  self_id: number
  post_type: 'request'
  request_type: 'friend'
  user_id: number
  comment: string
  flag: string
  quick_action: (approve?: boolean) => Promise<null>
}

export interface RequestHandler {
  'request.friend': RequestFriend
  'request.group': RequestHandler['request.group.invte'] | RequestHandler['request.group.add']
  'request.group.invte': RequestGroupInvite
  'request.group.add': RequestGroupAdd
  request: RequestHandler['request.friend'] | RequestHandler['request.group']
}

// =====================================================================================

export interface BotOffline {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'bot_offline'
  user_id: number
  tag: string
  message: string
}

export interface FriendAdd {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'friend_add'
  user_id: number
}

export interface FriendRecall {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'friend_recall'
  user_id: number
  message_id: number
}

export interface GroupAdminSet {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_admin'
  sub_type: 'set'
}

export interface GroupAdminUnset {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_admin'
  sub_type: 'unset'
}

export interface GroupBanBan {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_ban'
  operator_id: number
  duration: number
  sub_type: 'ban'
}

export interface GroupBanLiftBan {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_ban'
  operator_id: number
  duration: number
  sub_type: 'lift_ban'
}

export interface GroupCard {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_card'
  card_new: string
  card_old: string
}

export interface GroupDecreaseLeave {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_decrease'
  sub_type: 'leave'
  operator_id: number
}

export interface GroupDecreaseKick {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_decrease'
  sub_type: 'kick'
  operator_id: number
}

export interface GroupDecreaseKickMe {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_decrease'
  sub_type: 'kick_me'
  operator_id: number
}

export interface GroupEssenceAdd {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'essence'
  message_id: number
  sender_id: number
  sub_type: 'add'
}

export interface GroupEssenceDelete {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'essence'
  message_id: number
  sender_id: number
  sub_type: 'delete'
}

export interface GroupIncreaseApprove {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'group_increase'
  sub_type: 'approve'
  group_id: number
  operator_id: number
  user_id: number
}

export interface GroupIncreaseInvite {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'group_increase'
  sub_type: 'invite'
  group_id: number
  operator_id: number
  user_id: number
}

export interface NotifyGroupName {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'notify'
  sub_type: 'group_name'
  name_new: string
}

export interface GroupRecall {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_recall'
  operator_id: number
  message_id: number
}

export interface NotifyTitle {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'notify'
  sub_type: 'title'
  title: string
}

export interface GroupUpload {
  time: number
  self_id: number
  post_type: 'notice'
  group_id: number
  user_id: number
  notice_type: 'group_upload'
  file: {
    id: string
    name: string
    size: number
    busid: number
  }
}

export interface NotifyInputStatusGroup {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'notify'
  sub_type: 'input_status'
  status_text: string
  event_type: number
  user_id: number
  group_id: number
}

export interface NotifyInputStatusFriend {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'notify'
  sub_type: 'input_status'
  status_text: string
  event_type: number
  user_id: number
  group_id: 0
}

export interface GroupMsgEmojiLike {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'group_msg_emoji_like'
  group_id: number
  user_id: number
  message_id: number
  likes: { emoji_id: string; count: number }[]
}

export interface NotifyPokeFriend {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'notify'
  sub_type: 'poke'
  target_id: number
  user_id: number
  raw_info: [{ col: string; nm: string; type: 'qq'; uid: string }, { col: string; nm: string; tp: string; type: 'qq'; uid: string }]
}

export interface NotifyPokeGroup {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'notify'
  sub_type: 'poke'
  target_id: number
  user_id: number
  group_id: number
  raw_info: [
    { col: string; nm: string; type: 'qq'; uid: string },
    { jp: string; src: string; type: 'img' },
    { txt: string; type: 'nor' },
    { col: string; nm: string; tp: string; type: 'qq'; uid: string },
    { txt: string; type: 'nor' },
  ]
}

export interface NotifyProfileLike {
  time: number
  self_id: number
  post_type: 'notice'
  notice_type: 'notify'
  sub_type: 'profile_like'
  operator_id: number
  operator_nick: string
}

export interface NoticeHandler {
  'notice.bot_offline': BotOffline
  'notice.friend_add': FriendAdd
  'notice.friend_recall': FriendRecall
  'notice.group_admin': NoticeHandler['notice.group_admin.set'] | NoticeHandler['notice.group_admin.unset']
  'notice.group_admin.set': GroupAdminSet
  'notice.group_admin.unset': GroupAdminUnset
  'notice.group_ban': NoticeHandler['notice.group_ban.ban'] | NoticeHandler['notice.group_ban.lift_ban']
  'notice.group_ban.ban': GroupBanBan
  'notice.group_ban.lift_ban': GroupBanLiftBan
  'notice.group_card': GroupCard
  'notice.group_decrease': NoticeHandler['notice.group_decrease.leave'] | NoticeHandler['notice.group_decrease.kick'] | NoticeHandler['notice.group_decrease.kick_me']
  'notice.group_decrease.leave': GroupDecreaseLeave
  'notice.group_decrease.kick': GroupDecreaseKick
  'notice.group_decrease.kick_me': GroupDecreaseKickMe
  'notice.essence': NoticeHandler['notice.essence.add'] | NoticeHandler['notice.essence.delete']
  'notice.essence.add': GroupEssenceAdd
  'notice.essence.delete': GroupEssenceDelete
  'notice.group_increase': NoticeHandler['notice.group_increase.approve'] | NoticeHandler['notice.group_increase.invite']
  'notice.group_increase.approve': GroupIncreaseApprove
  'notice.group_increase.invite': GroupIncreaseInvite
  'notice.notify':
    | NoticeHandler['notice.notify.group_name']
    | NoticeHandler['notice.notify.title']
    | NoticeHandler['notice.notify.input_status.group']
    | NoticeHandler['notice.notify.input_status.friend']
    | NoticeHandler['notice.notify.poke.friend']
    | NoticeHandler['notice.notify.poke.group']
    | NoticeHandler['notice.notify.profile_like']
  'notice.notify.group_name': NotifyGroupName
  'notice.notify.title': NotifyTitle
  'notice.notify.input_status': NoticeHandler['notice.notify.input_status.group'] | NoticeHandler['notice.notify.input_status.friend']
  'notice.notify.input_status.group': NotifyInputStatusGroup
  'notice.notify.input_status.friend': NotifyInputStatusFriend
  'notice.notify.poke': NoticeHandler['notice.notify.poke.friend'] | NoticeHandler['notice.notify.poke.group']
  'notice.notify.poke.friend': NotifyPokeFriend
  'notice.notify.poke.group': NotifyPokeGroup
  'notice.notify.profile_like': NotifyProfileLike
  'notice.group_recall': GroupRecall
  'notice.group_upload': GroupUpload
  'notice.group_msg_emoji_like': GroupMsgEmojiLike
  notice:
    | NoticeHandler['notice.bot_offline']
    | NoticeHandler['notice.friend_add']
    | NoticeHandler['notice.friend_recall']
    | NoticeHandler['notice.group_admin']
    | NoticeHandler['notice.group_ban']
    | NoticeHandler['notice.group_card']
    | NoticeHandler['notice.group_decrease']
    | NoticeHandler['notice.essence']
    | NoticeHandler['notice.group_increase']
    | NoticeHandler['notice.notify']
    | NoticeHandler['notice.group_recall']
    | NoticeHandler['notice.group_upload']
    | NoticeHandler['notice.group_msg_emoji_like']
}

// =====================================================================================

export type AllHandlers = SocketHandler & ApiHandler & MessageHandler & MessageSentHandler & MetaEventHandler & RequestHandler & NoticeHandler

export type WSReceiveHandler = MessageHandler & MessageSentHandler & MetaEventHandler & RequestHandler & NoticeHandler

export type EventKey = keyof AllHandlers
export type HandlerResMap = {
  [K in EventKey]: AllHandlers[K]
}
export type EventHandleMap = {
  [K in EventKey]: (context: HandlerResMap[K]) => void
}

// =====================================================================================

export type WSSendParam = {
  // onebot 11
  send_private_msg: { user_id: number; message: Send[keyof Send][] }
  send_group_msg: { group_id: number; message: Send[keyof Send][] }
  send_msg: ({ user_id: number } | { group_id: number }) & { message: Send[keyof Send][] }
  delete_msg: { message_id: number }
  get_msg: { message_id: number }
  get_forward_msg: { message_id: string }
  send_like: { user_id: number; times?: number }
  set_group_kick: { group_id: number; user_id: number; reject_add_request?: boolean }
  set_group_ban: { group_id: number; user_id: number; duration?: number }
  // set_group_anonymous_ban: {}
  set_group_whole_ban: { group_id: number; enable?: boolean }
  set_group_admin: { group_id: number; user_id: number; enable?: boolean }
  // set_group_anonymous: {}
  set_group_card: { group_id: number; user_id: number; card: string }
  set_group_name: { group_id: number; group_name: string }
  set_group_leave: { group_id: number; is_dismiss?: boolean }
  set_group_special_title: { group_id: number; user_id: number; special_title: string }
  set_friend_add_request: { flag: string; approve?: boolean; remark?: string }
  set_group_add_request: { flag: string; approve?: boolean; reason?: string }
  get_login_info: {}
  get_stranger_info: { user_id: number }
  get_friend_list: {}
  get_group_info: { group_id: number }
  get_group_list: { no_cache?: boolean }
  get_group_member_info: { group_id: number; user_id: number; no_cache?: boolean }
  get_group_member_list: { group_id: number; no_cache?: boolean }
  get_group_honor_info: {
    group_id: number
    type?: 'all' | 'talkative' | 'performer' | 'legend' | 'strong_newbie' | 'emotion'
  }
  get_cookies: { domain: string }
  get_csrf_token: {}
  get_credentials: {}
  get_record: {
    file: string
    out_format?: 'mp3' | 'amr' | 'wma' | 'm4a' | 'spx' | 'ogg' | 'wav' | 'flac'
  }
  get_image: { file: string }
  can_send_image: {}
  can_send_record: {}
  get_status: {}
  get_version_info: {}
  // set_restart: { delay?: number }
  // clean_cache: {}
  bot_exit: {}

  // go-cqhttp
  set_qq_profile: { nickname: string; personal_note?: string; sex?: number }
  // qidian_get_account_info: {}
  _get_model_show: { model: string }
  // _set_model_show: {}
  // get_online_clients: {}
  // get_unidirectional_friend_list: {}
  delete_friend: { user_id: number; temp_block?: boolean; temp_both_del?: boolean }
  // delete_unidirectional_friend: {}
  mark_msg_as_read: { user_id: number } | { group_id: number } | { message_id: number }
  send_group_forward_msg: { group_id: number; message: Send['node'][] }
  send_private_forward_msg: { user_id: number; message: Send['node'][] }
  get_group_msg_history: {
    group_id: number
    message_seq?: number
    count?: number
    reverseOrder?: boolean
  }
  ocr_image: { image: string }
  // '.ocr_image': WSSendParam['ocr_image']
  get_group_system_msg: {}
  get_essence_msg_list: { group_id: number }
  get_group_at_all_remain: { group_id: number }
  set_group_portrait: { file: string; group_id: number }
  set_essence_msg: { message_id: number }
  delete_essence_msg: { message_id: number }
  _send_group_notice: {
    group_id: number
    content: string
    image?: string
    pinned?: number
    type?: number
    confirm_required?: number
    is_show_edit_card?: number
    tip_window_type?: number
  }
  _get_group_notice: { group_id: number }
  upload_group_file: {
    group_id: number
    file: string
    name: string
    folder_id?: string
  }
  delete_group_file: { group_id: number; file_id: string }
  create_group_file_folder: { group_id: number; folder_name: string }
  delete_group_folder: { group_id: number; folder_id: string }
  get_group_file_system_info: { group_id: number }
  get_group_root_files: { group_id: number; file_count?: number }
  get_group_files_by_folder: { group_id: number; file_count?: number; folder_id?: string }
  get_group_file_url: { group_id: number; file_id: string }
  upload_private_file: { user_id: number; file: string; name: string }
  // reload_event_filter: {}
  download_file: (
    | { base64: string }
    | {
        url: string
        headers?: string | string[]
      }
  ) & {
    name?: string
  }
  // check_url_safely: { url: string }
  // '.get_word_slices': {}
  '.handle_quick_operation':
    | {
        context: MessageHandler['message.private']
        operation: { reply?: Send[keyof Send][] }
      }
    | {
        context: MessageHandler['message.group']
        operation: { reply?: Send[keyof Send][]; at_sender?: boolean }
      }
    | { context: RequestHandler['request.friend']; operation: { approve?: boolean } }
    | {
        context: RequestHandler['request.group']
        operation: { approve?: boolean; reason?: string }
      }

  // napcat
  set_diy_online_status: { face_id: number; face_type: number; wording: string }
  ArkSharePeer: { group_id: string } | { user_id: string; phoneNumber?: string }
  ArkShareGroup: { group_id: string }
  // reboot_normal: { delay?: number }
  get_robot_uin_range: {}
  set_online_status: { status: number; ext_status: number; battery_status: number }
  get_friends_with_category: {}
  set_qq_avatar: { file: string }
  get_file: { file: string }
  forward_friend_single_msg: { message_id: number; user_id: number }
  forward_group_single_msg: { message_id: number; group_id: number }
  translate_en2zh: { words: string[] }
  set_msg_emoji_like: { message_id: number; emoji_id: string; set?: boolean }
  send_forward_msg: ({ user_id: number } | { group_id: number }) & { message: Send['node'][] }
  mark_private_msg_as_read: { user_id: number }
  mark_group_msg_as_read: { group_id: number }
  get_friend_msg_history: {
    user_id: number
    message_seq?: number
    count?: number
    reverseOrder?: boolean
  }
  create_collection: { rawData: string; brief: string }
  // get_collection_list: { category: number; count?: number }
  set_self_longnick: { longNick: string }
  get_recent_contact: { count?: number }
  _mark_all_as_read: {}
  get_profile_like: {}
  fetch_custom_face: { count?: number }
  fetch_emoji_like: {
    emojiId: string
    emojiType: string
    message_id: number
    count?: number
  }
  set_input_status: { user_id: string; event_type: number }
  get_group_info_ex: { group_id: number }
  // get_group_ignore_add_request: { group_id: number }
  _del_group_notice: { group_id: number; notice_id: string }
  // fetch_user_profile_like: { qq: number }
  friend_poke: { user_id: number }
  group_poke: { group_id: number; user_id: number }
  nc_get_packet_status: {}
  nc_get_user_status: { user_id: number }
  nc_get_rkey: {}
  get_group_shut_list: { group_id: number }

  // 不支持频道
  // get_guild_list: {}
  // get_guild_service_profile: {}

  get_group_ignored_notifies: { group_id: number }
  set_group_sign: { group_id: number }
  send_group_sign: WSSendParam['set_group_sign']
  send_packet: { cmd: string; data: string; rsp: boolean }
  get_mini_app_ark:
    | {
        type: 'bili' | 'weibo'
        title: string
        desc: string
        picUrl: string
        jumpUrl: string
        webUrl?: string
        rawArkData?: string
      }
    | {
        title: string
        desc: string
        picUrl: string
        jumpUrl: string
        iconUrl: string
        webUrl?: string
        appId: string
        scene: number
        templateType: number
        businessType: number
        verType: number
        shareType: number
        versionId: string
        sdkId: string
        withShareTicket: number
        rawArkData?: string
      }
  get_ai_record: {
    character: string
    group_id: number
    text: string
  }
  get_ai_characters: {
    group_id: number
    char_type?: number
  }
  send_group_ai_record: {
    character: string
    group_id: number
    text: string
  }
  get_clientkey: {}
  send_poke: { group_id: number; user_id: number } | { user_id: number }
  get_private_file_url: { file_id: string }
  click_inline_keyboard_button: { group_id: number; bot_appid: string; button_id?: string; callback_data?: string; msg_seq?: string }
}

export type WSSendReturn = {
  // ontbot11
  send_private_msg: WSSendReturn['send_msg']
  send_group_msg: WSSendReturn['send_msg']
  send_msg: { message_id: number }
  delete_msg: null
  get_msg: (
    | {
        message_type: 'private'
        sender: {
          user_id: number
          nickname: string
          card: string
        }
        sub_type: 'friend'
      }
    | {
        message_type: 'group'
        group_id: number
        sender: {
          user_id: number
          nickname: string
          card: string
          role: 'owner' | 'admin' | 'member'
        }
        sub_type: 'normal'
      }
  ) & {
    self_id: number
    user_id: number
    time: number
    message_id: number
    message_seq: number
    real_id: number
    raw_message: string
    font: number
    post_type: 'message' | 'message_sent'
  } & MessageType
  get_forward_msg: {
    messages: WSSendReturn['get_msg'][]
  }
  send_like: null
  set_group_kick: null
  set_group_ban: null
  // set_group_anonymous_ban: null
  set_group_whole_ban: null
  set_group_admin: null
  // set_group_anonymous: null
  set_group_card: null
  set_group_name: null
  set_group_leave: null
  set_group_special_title: null
  set_friend_add_request: null
  set_group_add_request: null
  get_login_info: {
    user_id: number
    nickname: string
  }
  get_stranger_info: {
    uid: string
    uin: string
    nick: string
    remark: string
    constellation: number
    shengXiao: number
    kBloodType: number
    homeTown: string
    makeFriendCareer: number
    pos: string
    college: string
    country: string
    province: string
    city: string
    postCode: string
    address: string
    regTime: number
    interest: string
    labels: string[]
    qqLevel: number
    qid: string
    longNick: string
    birthday_year: number
    birthday_month: number
    birthday_day: number
    age: number
    sex: 'male' | 'female' | 'unknown'
    eMail: string
    phoneNum: string
    categoryId: number
    richTime: number
    richBuffer: string | {}
    topTime: string
    isBlock: boolean
    isMsgDisturb: boolean
    isSpecialCareOpen: boolean
    isSpecialCareZone: boolean
    ringId: string
    isBlocked: boolean
    recommendImgFlag: number
    disableEmojiShortCuts: number
    qidianMasterFlag: number
    qidianCrewFlag: number
    qidianCrewFlag2: number
    isHideQQLevel: number
    isHidePrivilegeIcon: number
    status: number
    extStatus: number
    batteryStatus: number
    termType: number
    netType: number
    iconType: number
    customStatus: unknown
    setTime: string
    specialFlag: number
    abiFlag: number
    eNetworkType: number
    showName: string
    termDesc: string
    musicInfo: {
      buf: string | {}
    }
    extOnlineBusinessInfo: {
      buf: string | {}
      customStatus: unknown
      videoBizInfo: {
        cid: string
        tvUrl: string
        synchType: string
      }
      videoInfo: {
        name: string
      }
    }
    extBuffer: {
      buf: string | {}
    }
    user_id: number
    nickname: string
    long_nick: string
    reg_time: number
    is_vip: boolean
    is_years_vip: boolean
    vip_level: number
    login_days: number
  }
  get_friend_list: {
    qid: string
    longNick: string
    birthday_year: number
    birthday_month: number
    birthday_day: number
    age: number
    sex: string
    eMail: string
    phoneNum: string
    categoryId: number
    richTime: number
    richBuffer: { [key: string]: number }
    uid: string
    uin: string
    nick: string
    remark: string
    user_id: number
    nickname: string
    level: number
  }[]
  get_group_info: {
    group_id: number
    group_name: string
    member_count: number
    max_member_count: number
  }
  get_group_list: WSSendReturn['get_group_info'][]
  get_group_member_info: {
    group_id: number
    user_id: number
    nickname: string
    card: string
    sex: 'unknown' | 'male' | 'female'
    age: number
    area: string
    level: string
    qq_level: number
    join_time: number
    last_sent_time: number
    title_expire_time: number
    unfriendly: boolean
    card_changeable: boolean
    is_robot: boolean
    shut_up_timestamp: number
    role: 'owner' | 'admin' | 'member'
    title: string
  }
  get_group_member_list: WSSendReturn['get_group_info'][]
  get_group_honor_info: {
    group_id: string
    current_talkative: {
      user_id: number
      avatar: string
      nickname: string
      day_count: number
      description: string
    }
    talkative_list: {
      user_id: number
      avatar: string
      description: string
      day_count: number
      nickname: string
    }[]
    performer_list: {
      user_id: number
      avatar: string
      description: string
      day_count: number
      nickname: string
    }[]
    legend_list: {
      user_id: number
      avatar: string
      description: string
      day_count: number
      nickname: string
    }[]
    emotion_list: {
      user_id: number
      avatar: string
      description: string
      day_count: number
      nickname: string
    }[]
    strong_newbie_list: {
      user_id: number
      avatar: string
      description: string
      day_count: number
      nickname: string
    }[]
  }
  get_cookies: {
    cookies: string
    bkn: string
  }
  get_csrf_token: { token: string }
  get_credentials: {
    cookies: string
    token: string
  }
  get_record: {
    file: string
    url: string
    file_size: string
    file_name: string
    base64?: string
  }
  get_image: WSSendReturn['get_record']
  can_send_image: { yes: true }
  can_send_record: { yes: true }
  get_status: {
    online: boolean
    good: true
    stat: {}
  }
  get_version_info: {
    app_name: 'NapCat.Onebot'
    protocol_version: 'v11'
    app_version: string
  }
  // set_restart: null
  // clean_cache: null
  bot_exit: null

  // go-cqhttp
  set_qq_profile: { result: 0; errMsg: '' }
  // qidian_get_account_info: null
  _get_model_show: { variants: { model_show: string; need_pay: boolean } }[]
  // _set_model_show: null
  // get_online_clients: null
  // get_unidirectional_friend_list: null
  delete_friend: { result: 0; errMsg: 'success' }
  // delete_unidirectional_friend: null
  mark_msg_as_read: null
  send_group_forward_msg: WSSendReturn['send_msg']
  send_private_forward_msg: WSSendReturn['send_msg']
  get_group_msg_history: {
    messages: WSSendReturn['get_msg'][]
  }
  ocr_image: {
    text: string
    pt1: { x: string; y: string }
    pt2: { x: string; y: string }
    pt3: { x: string; y: string }
    pt4: { x: string; y: string }
    charBox: {
      charText: string
      charBox: {
        pt1: { x: string; y: string }
        pt2: { x: string; y: string }
        pt3: { x: string; y: string }
        pt4: { x: string; y: string }
      }
    }[]
    score: string
  }[]
  // '.ocr_image': WSSendReturn['ocr_image']
  get_group_system_msg: {
    InvitedRequest: {
      request_id: number
      invitor_uin: number
      invitor_nick: string
      group_id: number
      group_name: string
      checked: boolean
      actor: number
    }[]
    join_requests: {
      request_id: number
      invitor_uin: number
      invitor_nick: string
      group_id: number
      group_name: string
      checked: boolean
      actor: number
    }[]
  }
  get_essence_msg_list: {
    msg_seq: number
    msg_random: number
    sender_id: number
    sender_nick: string
    operator_id: number
    operator_nick: string
    message_id: number
    operator_time: number
    content: Receive[keyof Receive][]
  }[]
  get_group_at_all_remain: {
    can_at_all: boolean
    remain_at_all_count_for_group: number
    remain_at_all_count_for_uin: number
  }
  set_group_portrait: { result: 0; errMsg: 'success' }
  set_essence_msg: { errCode: 0; errMsg: 'success' }
  delete_essence_msg: { errCode: 0; errMsg: 'success' }
  _send_group_notice: null
  _get_group_notice: {
    notice_id: string
    sender_id: number
    publish_time: number
    message: {
      text: string
      image: {
        id: string
        height: string
        width: string
      }[]
    }
  }[]
  upload_group_file: null
  delete_group_file: {
    result: 0
    errMsg: 'ok'
    transGroupFileResult: {
      result: {
        retCode: 0
        retMsg: 'ok'
        clientWording: ''
      }
      successFileIdList: string[]
      failFileIdList: string[]
    }
  }
  create_group_file_folder: {
    result: {
      retCode: 0
      retMsg: 'ok'
      clientWording: ''
    }
    groupItem: {
      peerId: string
      type: number
      folderInfo: {
        folderId: string
        parentFolderId: string
        folderName: string
        createTime: number
        modifyTime: number
        createUin: string
        creatorName: string
        totalFileCount: number
        modifyUin: string
        modifyName: string
        usedSpace: string
      }
      fileInfo: null
    }
  }
  delete_group_folder: { retCode: 0; retMsg: 'ok'; clientWording: '' }
  get_group_file_system_info: {
    file_count: number
    limit_count: 10000
    used_space: 0
    total_space: 10737418240
  }
  get_group_root_files: {
    files: {
      group_id: number
      file_id: string
      file_name: string
      busid: number
      size: number
      upload_time: number
      dead_time: number
      modify_time: number
      download_times: number
      uploader: number
      uploader_name: string
    }[]
    folders: {
      group_id: number
      folder_id: string
      folder: string
      folder_name: string
      create_time: number
      creator: number
      creator_name: string
      total_file_count: number
    }[]
  }
  get_group_files_by_folder: WSSendReturn['get_group_root_files']
  get_group_file_url: { url: string }
  upload_private_file: null
  // reload_event_filter: null
  download_file: { file: string }
  // check_url_safely: { level: 1 }
  // '.get_word_slices': null
  '.handle_quick_operation': null

  // napcat
  set_diy_online_status: string
  ArkSharePeer: {
    errCode: 0
    errMsg: ''
    arkJson: string
  }
  ArkShareGroup: string
  // reboot_normal: null
  get_robot_uin_range: {
    minUin: string
    maxUin: string
  }[]
  set_online_status: null
  get_friends_with_category: {
    categoryId: number
    categorySortId: number
    categoryName: string
    categoryMbCount: number
    onlineCount: number
    buddyList: WSSendReturn['get_friend_list']
  }[]
  set_qq_avatar: null
  get_file: WSSendReturn['get_record']
  forward_friend_single_msg: null
  forward_group_single_msg: null
  translate_en2zh: string[]
  set_msg_emoji_like: null
  send_forward_msg: { message_id: number; res_id: string }
  mark_private_msg_as_read: null
  mark_group_msg_as_read: null
  get_friend_msg_history: { messages: WSSendReturn['get_msg'][] }
  create_collection: { result: 0; errMsg: '' }
  // get_collection_list: {
  //   result: 0
  //   errMsg: ''
  //   collectionSearchList: {
  //     collectionItemList: {
  //       cid: string
  //       type: number
  //       status: number
  //       author: {
  //         type: number
  //         numId: string
  //         strId: string
  //         groupId: string
  //         groupName: string
  //         uid: string
  //       }
  //       bid: number
  //       category: number
  //       createTime: string
  //       collectTime: string
  //       modifyTime: string
  //       sequence: string
  //       shareUrl: string
  //       customGroupId: number
  //       securityBeat: boolean
  //       summary: {
  //         textSummary: unknown
  //         linkSummary: unknown
  //         gallerySummary: unknown
  //         audioSummary: unknown
  //         videoSummary: unknown
  //         fileSummary: unknown
  //         locationSummary: unknown
  //         richMediaSummary: unknown
  //       }
  //     }[]
  //     hasMore: boolean
  //     bottomTimeStamp: string
  //   }
  // }
  set_self_longnick: { result: 0; errMsg: '' }
  get_recent_contact: (
    | {
        lastestMsg: WSSendReturn['get_msg']
        peerUin: string
        remark: string
        msgTime: string
        chatType: number
        msgId: string
        sendNickName: string
        sendMemberName: string
        peerName: string
      }
    | {
        peerUin: string
        remark: string
        msgTime: number
        chatType: number
        msgId: string
        sendNickName: string
        sendMemberName: string
        peerName: string
      }
  )[]
  _mark_all_as_read: null
  get_profile_like: {
    uid: string
    time: number
    favoriteInfo: {
      total_count: number
      last_time: number
      today_count: number
      userInfos: {
        age: number
        bAvailableCnt: number
        bTodayVotedCnt: number
        count: number
        customId: number
        gender: number
        giftCount: number
        isFriend: boolean
        isSvip: boolean
        isvip: boolean
        lastCharged: number
        latestTime: number
        nick: string
        src: number
        uid: string
        uin: number
      }[]
    }
    voteInfo: {
      total_count: number
      new_count: number
      new_nearby_count: number
      last_visit_time: number
      userInfos: {
        age: number
        bAvailableCnt: number
        bTodayVotedCnt: number
        count: number
        customId: number
        gender: number
        giftCount: number
        isFriend: boolean
        isSvip: boolean
        isvip: boolean
        lastCharged: number
        latestTime: number
        nick: string
        src: number
        uid: string
        uin: number
      }[]
    }
  }[]
  fetch_custom_face: string[]
  fetch_emoji_like: {
    result: 0
    errMsg: ''
    emojiLikesList: {
      tinyId: string
      nickName: string
      headUrl: string
    }[]
    cookie: ''
    isLastPage: boolean
    isFirstPage: boolean
  }
  set_input_status: { result: 0; errMsg: 'success' }
  get_group_info_ex: {
    groupCode: string
    resultCode: 0
    extInfo: {
      groupInfoExtSeq: number
      reserve: number
      luckyWordId: string
      lightCharNum: number
      luckyWord: string
      starId: number
      essentialMsgSwitch: number
      todoSeq: number
      blacklistExpireTime: number
      isLimitGroupRtc: number
      companyId: number
      hasGroupCustomPortrait: number
      bindGuildId: string
      groupOwnerId: {
        memberUin: string
        memberUid: string
        memberQid: string
      }
      essentialMsgPrivilege: number
      msgEventSeq: string
      inviteRobotSwitch: number
      gangUpId: string
      qqMusicMedalSwitch: number
      showPlayTogetherSwitch: number
      groupFlagPro1: string
      groupBindGuildIds: { guildIds: string[] }
      viewedMsgDisappearTime: string
      groupExtFlameData: {
        switchState: number
        state: number
        dayNums: string[]
        version: number
        updateTime: string
        isDisplayDayNum: false
      }
      groupBindGuildSwitch: number
      groupAioBindGuildId: string
      groupExcludeGuildIds: { guildIds: string[] }
      fullGroupExpansionSwitch: number
      fullGroupExpansionSeq: string
      inviteRobotMemberSwitch: number
      inviteRobotMemberExamine: number
      groupSquareSwitch: number
    }
  }
  // get_group_ignore_add_request: {
  //   join_requests: {
  //     request_id: number
  //     requester_uin: number
  //     requester_nick: string
  //     group_id: number
  //     group_name: string
  //     checked: boolean
  //     actor: number
  //   }[]
  // }
  _del_group_notice: null
  // fetch_user_profile_like: string
  friend_poke: null
  group_poke: null
  nc_get_packet_status: undefined
  nc_get_user_status: { status: number; ext_status: number }
  nc_get_rkey: {
    rkey: string
    ttl: string
    time: number
    type: number
  }[]
  get_group_shut_list: {
    uid: string
    qid: string
    uin: string
    nick: string
    remark: string
    cardType: number
    cardName: string
    role: number
    avatarPath: string
    shutUpTime: number
    isDelete: boolean
    isSpecialConcerned: boolean
    isSpecialShield: boolean
    isRobot: boolean
    groupHonor: { [key: string]: number }
    memberRealLevel: number
    memberLevel: number
    globalGroupLevel: number
    globalGroupPoint: number
    memberTitleId: number
    memberSpecialTitle: string
    specialTitleExpireTime: string
    userShowFlag: number
    userShowFlagNew: number
    richFlag: number
    mssVipType: number
    bigClubLevel: number
    bigClubFlag: number
    autoRemark: string
    creditLevel: number
    joinTime: number
    lastSpeakTime: number
    memberFlag: number
    memberFlagExt: number
    memberMobileFlag: number
    memberFlagExt2: number
    isSpecialShielded: boolean
    cardNameId: number
  }[]

  // 不支持频道
  // get_guild_list: number
  // get_guild_service_profile: number

  get_group_ignored_notifies: WSSendReturn['get_group_system_msg']
  set_group_sign: null
  send_group_sign: WSSendReturn['set_group_sign']
  send_packet: string
  get_mini_app_ark: {
    title: string
    desc: string
    picUrl: string
    jumpUrl: string
    webUrl?: string
    sdkId: string
    appId: string
    scene: number
    iconUrl: string
    templateType: number
    businessType: number
    verType: number
    shareType: number
    versionId: string
    withShareTicket: number
  }
  get_ai_record: string
  get_ai_characters: {
    type: string
    characters: {
      character_id: string
      character_name: string
      preview_url: string
    }[]
  }[]
  send_group_ai_record: null
  get_clientkey: { clientkey: string }
  send_poke: null
  get_private_file_url: { url: string }
  click_inline_keyboard_button: {
    result: 0
    errMsg: ''
    status: number
    promptText: string
    promptType: number
    promptIcon: number
  }
}
