import { definePlugin, Structs } from '../../src/core/plugin'

const REG = {
    self: /^\s*([赞超草])我\s*$/, // 不需要匹配其他词就改为 /^\s*赞我\s*$/
    other: /^\s*([赞超草])[它她他]/i, // 不需要匹配其他词就改为 /^\s*赞[它她他]\s*$/
}

export default definePlugin({
    name: 'like',
    version: '1.0.0',
    desc: '点赞插件',
    setup(ctx) {
        ctx.handle('message.group', async (e) => {
            const selfMatches = e.raw_message.match(REG.self)

            if (selfMatches) {
                await responseLike(ctx, e, e.sender.user_id)
                return
            }

            const otherMatches = e.raw_message.match(REG.other)
            const id = +(e.message.find((m) => m.type === 'at')?.data.qq ?? 0)

            if (otherMatches && id && !Number.isNaN(id)) {
                await responseLike(ctx, e, id)
                return
            }
        })
    },
})

async function responseLike(ctx, e, id) {
    let count = 0
    
    try {
        while (true) {
            const result = await ctx.sendLike(id, 10)
            if (result.status === "ok") {
                count += 10
            } else {
                break
            }
        }
    } catch { }

    if (count) {
        await ctx.napcat.set_msg_emoji_like({
            message_id: e.message_id,
            emoji_id: 201,
            set: true
        })
    } else {
        await ctx.napcat.set_msg_emoji_like({
            message_id: e.message_id,
            emoji_id: 174,
            set: true
        })
    }
}
