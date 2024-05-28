import {
  ANSWERS_TIMEOUT,
  INLINE_KEYBOARD_CHAT_WITH_BOT,
  SCENES,
} from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { Chat } from '@telegraf/types'
import { answerOfMembers } from '@tools/formatting'
import { getRandomEmoji } from '@tools/utils'
import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import type { BotContext, NextContext, TextMessageContext } from '../context'

// ------- [ enter ] ------- //

const requestForAnswers = async (ctx: BotContext) => {
  if (!ctx.from) return ctx.scene.reset()

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

  const [chatId] = currentRoom
  const members = game.getMembersInGame(chatId)
  const husband = game.getHusbandInGame(chatId)

  for (const [memberId] of members) {
    await ctx.telegram.sendMessage(memberId, t('member.answer.base'), {
      parse_mode: 'MarkdownV2',
    })
  }

  if (husband) {
    await ctx.telegram.sendMessage(husband[0], t('husband.ask_send_message'), {
      parse_mode: 'MarkdownV2',
    })
  }

  game.registerTimeoutEvent(
    chatId,
    async () => onTimeoutEvent(ctx, chatId),
    ANSWERS_TIMEOUT,
  )
}

// ------- [ actions ] ------- //

const onTimeoutEvent = async (ctx: BotContext, chatId: Chat['id']) => {
  game.setAFKMembersInAnswers(chatId)
  await completeAnswers(ctx, chatId)
}

// ------- [ text messages ] ------- //

const completeAnswers = async (ctx: BotContext, chatId: Chat['id']) => {
  const { answers, reply } = game.rooms.get(chatId)!
  const members = game.getMembersInGame(chatId)
  const textMessage = answerOfMembers(members, answers)

  for (const [memberId, member] of members) {
    if (!member.afk) continue

    await ctx.telegram.sendMessage(memberId, t('member.answer.afk'), {
      parse_mode: 'HTML',
    })
  }

  await ctx.telegram.sendMessage(chatId, textMessage, {
    reply_markup: INLINE_KEYBOARD_CHAT_WITH_BOT(ctx.botInfo.username)
      .reply_markup,
    parse_mode: 'HTML',
    reply_parameters: reply
      ? {
          message_id: reply,
          chat_id: chatId,
          allow_sending_without_reply: true,
        }
      : undefined,
  })

  game.completeMemberAnswers(chatId)

  await ctx.scene.enter(SCENES.elimination)
}

const checkSendTextMessageAvailability = async (
  ctx: TextMessageContext,
  next: NextContext,
) => {
  if (ctx.chat.type !== 'private') return

  return next()
}

const onSendMessageByHusband = async (
  ctx: TextMessageContext,
  next: NextContext,
) => {
  const {
    text,
    from: { id: userId },
  } = ctx.message

  if (game.isHusbandRole(userId)) {
    const currentRoom = game.getRoomOfUser(userId)

    if (!currentRoom) return

    const [roomId] = currentRoom

    return Promise.all([
      ctx.react(getRandomEmoji()),
      ctx.telegram.sendMessage(
        roomId,
        t('husband.send_message', { message: text }),
        { parse_mode: 'HTML' },
      ),
    ])
  }

  return next()
}

const onSendAnswer = async (ctx: TextMessageContext) => {
  const {
    text,
    from: { id: userId },
  } = ctx.message
  const answered = game.setAnswerByMember(userId, text)
  const currentRoom = game.getRoomOfUser(userId)

  if (!answered || !currentRoom) return

  await ctx.react(getRandomEmoji())

  const [roomId] = currentRoom

  if (game.everyoneAnswered(roomId)) {
    return completeAnswers(ctx, roomId)
  }
}

// ------- [ Scene ] ------- //

const answersScene = new Scenes.BaseScene<BotContext>(SCENES.answers)

answersScene.enter(requestForAnswers)

answersScene.on(
  message('text'),
  async (ctx, next) => checkSendTextMessageAvailability(ctx, next),
  async (ctx, next) => onSendMessageByHusband(ctx, next),
  async ctx => onSendAnswer(ctx),
)

export default answersScene
