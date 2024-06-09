import { INLINE_KEYBOARD_INVITE_CHAT } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import { mentionWithHTML } from '@tools/formatting'
import { getRandomEmoji } from '@tools/utils'
import { Composer } from 'telegraf'
import type { BotContext, TextMessageFn } from '../context'

// ------- [ text message ] ------- //

const handleStartCommand: TextMessageFn = async (ctx, next) => {
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
}

const handleHelpCommand: TextMessageFn = async ctx => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithHTML(t('help.main')) // TODO: fill data
  }

  await Promise.all([
    ctx.deleteMessage().catch(),
    ctx.telegram.sendMessage(ctx.from.id, t('help.main'), {
      parse_mode: 'HTML',
    }),
  ])
}

// ------- [ composer ] ------- //

const composer = new Composer<BotContext>()

composer.start(handleStartCommand)
composer.help(handleHelpCommand)

export default composer
