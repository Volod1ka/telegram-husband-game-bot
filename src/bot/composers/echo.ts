import { getInlineKeyboardInviteChat } from '@constants/inlineKeyboard'
import { AUTO_CLEAR_MESSAGE_TIMEOUT } from '@constants/properties'
import game from '@game/engine'
import { t } from '@i18n'
import type { MessageId } from '@telegraf/types'
import { mentionWithHTML } from '@tools/formatting'
import { getRandomEmoji, handleCatch } from '@tools/utils'
import { Composer } from 'telegraf'
import type { BotContext, MessageReactionFn, TextMessageFn } from '../context'

// ------- [ utility functions ] ------- //

const autoClearMessage = (
  ctx: BotContext,
  messageId: MessageId['message_id'],
) => {
  const timeout = setTimeout(async () => {
    await ctx.deleteMessage(messageId).catch(error => handleCatch(error, ctx))
    clearTimeout(timeout)
  }, AUTO_CLEAR_MESSAGE_TIMEOUT)
}

// ------- [ text message ] ------- //

const handleStartCommand: TextMessageFn = async (ctx, next) => {
  if (ctx.chat.type !== 'private') {
    return next()
  }

  if (game.getRoomOfUser(ctx.from.id)) {
    return ctx.react('🌚')
  }

  const text = t('start.welcome', { user: mentionWithHTML(ctx.from) })
  const inlineKeyboardMarkup = getInlineKeyboardInviteChat(ctx.botInfo.username)

  await Promise.all([
    ctx.replyWithHTML(text, inlineKeyboardMarkup),
    ctx.react(getRandomEmoji()),
  ])
}

const handleHelpCommand: TextMessageFn = async ctx => {
  if (ctx.chat.type === 'private') {
    return ctx.replyWithHTML(t('help.main')) // TODO: fill data
  }

  await Promise.all([
    ctx.deleteMessage().catch(error => handleCatch(error, ctx)),
    ctx.telegram.sendMessage(ctx.from.id, t('help.main'), {
      parse_mode: 'HTML',
    }),
  ])
}

// ------- [ reactions ] ------- //

const handleReaction: MessageReactionFn = async ctx => {
  const { message_id } = await ctx.replyWithHTML(
    t('reaction.fuck', { user: mentionWithHTML(ctx.from) }),
  )

  autoClearMessage(ctx, message_id)
}

// ------- [ composer ] ------- //

const composer = new Composer<BotContext>()

composer.start(handleStartCommand)
composer.help(handleHelpCommand)
composer.reaction(['🖕'], handleReaction)

export default composer
