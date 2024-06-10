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
import type {
  BotContext,
  ContextFn,
  GuardTextMessageFn,
  TextMessageFn,
} from '../context'

// ------- [ bot context ] ------- //

const requestForAnswers: ContextFn = async ctx => {
  if (!ctx.from) return ctx.scene.reset()

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

  const [chatId] = currentRoom
  const members = game.getMembersInGame(chatId)
  const husband = game.getHusbandInGame(chatId)

  for (const [memberId] of members) {
    await ctx.telegram.sendMessage(memberId, t('member.answer.base'), {
      parse_mode: 'HTML',
    })
  }

  if (husband) {
    await ctx.telegram.sendMessage(husband[0], t('husband.ask_send_message'), {
      parse_mode: 'HTML',
    })
  }

  game.registerTimeoutEvent(
    chatId,
    async () => onTimeoutEvent(ctx, chatId),
    ANSWERS_TIMEOUT,
  )
}

const onTimeoutEvent = async (ctx: BotContext, chatId: Chat['id']) => {
  game.setAFKMembersInAnswers(chatId)
  await completeAnswers(ctx, chatId)
}

const completeAnswers = async (ctx: BotContext, chatId: Chat['id']) => {
  game.unregisterTimeoutEvent(chatId)

  const { answers, replyId } = game.rooms.get(chatId)!
  const members = game.getMembersInGame(chatId)
  const textMessage = answerOfMembers(members, answers)

  for (const [memberId, member] of members) {
    if (!member.afk) continue

    await ctx.telegram.sendMessage(memberId, t('member.answer.afk'), {
      parse_mode: 'HTML',
    })
  }

  const { message_id } = await ctx.telegram.sendMessage(chatId, textMessage, {
    reply_markup: INLINE_KEYBOARD_CHAT_WITH_BOT(ctx.botInfo.username)
      .reply_markup,
    parse_mode: 'HTML',
    reply_parameters: replyId
      ? { message_id: replyId, allow_sending_without_reply: true }
      : undefined,
  })

  game.completeMemberAnswers(chatId, message_id)

  await ctx.scene.enter(SCENES.elimination)
}

// ------- [ text message ] ------- //

const checkSendTextMessageAvailability: TextMessageFn = async (ctx, next) => {
  if (ctx.chat.type !== 'private') return

  return next()
}

const onSendMessageByHusband: TextMessageFn = async (ctx, next) => {
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

const onSendAnswer: TextMessageFn = async ctx => {
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

// ------- [ scene ] ------- //

const answersScene = new Scenes.BaseScene<BotContext>(SCENES.answers)

answersScene.enter(requestForAnswers)

answersScene.on<GuardTextMessageFn>(
  message('text'),
  checkSendTextMessageAvailability,
  onSendMessageByHusband,
  onSendAnswer,
)

export default answersScene
