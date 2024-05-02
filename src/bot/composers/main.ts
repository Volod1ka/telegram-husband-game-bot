import { INLINE_KEYBOARD_INVITE_CHAT } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import { Composer } from 'telegraf'
import type { BotContext } from '../context'

const composer = new Composer<BotContext>()

composer.start(async (ctx, next) => {
  if (ctx.chat.type !== 'private') return next()

  if (game.getRoomOfUser(ctx.from.id)) {
    return ctx.react('🌚')
  }

  await ctx.replyWithMarkdownV2(
    t('start', { ctx }),
    INLINE_KEYBOARD_INVITE_CHAT(ctx.botInfo.username),
  )
  await ctx.react('💅')
})

// TODO: fill data
composer.help(async ctx => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithMarkdownV2(t('help.main'))
  }

  await ctx.deleteMessage()
  await ctx.telegram.sendMessage(ctx.from.id, t('help.main'), {
    parse_mode: 'MarkdownV2',
  })
})

export default composer
