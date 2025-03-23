import { definePlugin, Structs } from '../../src/core/plugin'

export default definePlugin({
  name: '高级示例',
  version: '1.0.0',
  desc: '展示如何使用扩展的插件API',
  
  setup(ctx) {
    // 使用扩展的API
    ctx.handle('message', async e => {
      // 检查消息内容
      const text = ctx.getText(e);
      
      if (text === '群列表') {
        // 检查权限
        if (!ctx.isAdmin(e)) {
          e.reply('你没有权限执行此命令');
          return;
        }
        
        try {
          // 获取群列表
          const groups = await ctx.getGroupList();
          
          // 构建回复消息
          const message = [
            Structs.text('===== 群列表 =====\n')
          ];
          
          groups.forEach((group, index) => {
            message.push(Structs.text(`${index + 1}. ${group.group_name} (${group.group_id})\n`));
          });
          
          // 发送回复
          e.reply(message);
        } catch (error) {
          ctx.logger.error('获取群列表失败:', error);
          e.reply('获取群列表失败，请查看日志');
        }
      }
      
      // 其他命令示例...
    });
    
    // 记录插件加载信息
    ctx.logger.info('高级示例插件已加载');
  }
}) 