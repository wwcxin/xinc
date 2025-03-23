import { definePlugin, Structs } from '../../src/core/plugin'

export default definePlugin({
  name: '你好世界',
  version: '1.0.0',
  desc: '一个简单的示例插件，回复"你好"',
  
  setup(ctx) {
    // 处理所有消息
    ctx.handle('message', async e => {
      if (e.raw_message === '你好') {
        e.reply('世界，你好！')
      }
    })
    
    // 处理私聊消息
    ctx.handle('message.private', async e => {
      if (e.raw_message === '私聊你好') {
        e.reply('这是私聊回复：你好！')
      }
    })
    
    // 处理群聊消息
    ctx.handle('message.group', async e => {
      if (e.raw_message === '群聊你好') {
        e.reply('这是群聊回复：大家好！')
      }
    })
    
    // 使用 napcat API
    ctx.handle('message', async e => {
      if (e.raw_message === '菜单') {
        // 使用 Structs 构建消息
        const message = [
          Structs.text('=== 菜单 ===\n'),
          Structs.text('1. 输入"你好"获取回复\n'),
          Structs.text('2. 输入"私聊你好"获取私聊回复\n'),
          Structs.text('3. 输入"群聊你好"获取群聊回复\n'),
          Structs.text('4. 输入"引用回复"获取引用回复')
        ]
        
        e.reply(message)
      }
      
      // 测试引用回复
      if (e.raw_message === '引用回复') {
        e.reply('这是一条引用回复消息', true)
      }
    })
    
    // 记录插件加载信息
    ctx.logger.info('你好世界插件已加载')
  }
}) 