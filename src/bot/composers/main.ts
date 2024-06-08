import { INLINE_KEYBOARD_INVITE_CHAT } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import { mentionWithHTML } from '@tools/formatting'
import { getRandomEmoji } from '@tools/utils'
import { Composer } from 'telegraf'
import type { BotContext } from '../context'

const composer = new Composer<BotContext>()

composer.start(async (ctx, next) => {
  if (ctx.chat.type !== 'private') return next()

  if (game.getRoomOfUser(ctx.from.id)) {
    return ctx.react('🌚')
  }

  await Promise.all([
    ctx.replyWithHTML(
      t('start.welcome', { ctx, user: mentionWithHTML(ctx.from) }),
      INLINE_KEYBOARD_INVITE_CHAT(ctx.botInfo.username),
    ),
    ctx.react(getRandomEmoji()),
  ])
})

// TODO: fill data
composer.help(async ctx => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithHTML(t('help.main'))
  }

  await Promise.all([
    ctx.deleteMessage(),
    ctx.telegram.sendMessage(ctx.from.id, t('help.main'), {
      parse_mode: 'HTML',
    }),
  ])
})

export default composer
