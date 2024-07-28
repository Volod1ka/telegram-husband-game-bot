import {
  ANSWERS_TIMEOUT,
  INLINE_KEYBOARD_CHAT_WITH_BOT,
  MAX_ANSWER_LENGTH,
  MAX_HUSBAND_MESSAGE_LENGTH,
  SCENES,
} from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { Chat, MessageId } from '@telegraf/types'
import { formattedTextForHTML, getAnswerOfMembers } from '@tools/formatting'
import { getRandomEmoji } from '@tools/utils'
import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import type {
  BotContext,
  ContextFn,
  GuardTextMessageFn,
  TextMessageFn,
} from '../context'

// ------- [ utility functions ] ------- //

const handleTimeoutEvent = async (ctx: BotContext, chatId: Chat['id']) => {
  game.setAFKMembersInAnswers(chatId)
  await completeAnswers(ctx, chatId)
}

const completeAnswers = async (ctx: BotContext, chatId: Chat['id']) => {
  game.unregisterTimeoutEvent(chatId)

  const { answers, replyId } = game.allRooms.get(chatId)!
  const members = game.getMembersInGame(chatId)
  const textMessages = getAnswerOfMembers(members, answers)
  let replyMessageId: MessageId['message_id'] = 0

  for (const [memberId, member] of members) {
    if (!member.afk) continue

    await ctx.telegram.sendMessage(memberId, t('member.answer.afk'), {
      parse_mode: 'HTML',
    })
  }

  for (const [index, text] of textMessages.entries()) {
    const { message_id } = await ctx.telegram.sendMessage(
      chatId,
      formattedTextForHTML(text),
      {
        reply_markup:
          index === textMessages.length - 1
            ? INLINE_KEYBOARD_CHAT_WITH_BOT(ctx.botInfo.username).reply_markup
            : undefined,
        parse_mode: 'HTML',
        reply_parameters:
          index === 0 && replyId
            ? { message_id: replyId, allow_sending_without_reply: true }
            : undefined,
      },
    )

    if (index === 0) {
      replyMessageId = message_id
    }
  }

  game.completeMemberAnswers(chatId, replyMessageId)

  await ctx.scene.enter(SCENES.elimination)
}

// ------- [ bot context ] ------- //

const requestForAnswers: ContextFn = async ctx => {
  if (!ctx.from) return ctx.scene.reset()

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

  const [roomId] = currentRoom
  const members = game.getMembersInGame(roomId)
  const husband = game.getHusbandInGame(roomId)

  for (const [memberId] of members) {
    await ctx.telegram.sendMessage(
      memberId,
      t('member.answer.base', { amount: MAX_ANSWER_LENGTH }),
      { parse_mode: 'HTML' },
    )
  }

  if (husband) {
    await ctx.telegram.sendMessage(
      husband[0],
      t('husband.send_message.ask', { amount: MAX_HUSBAND_MESSAGE_LENGTH }),
      { parse_mode: 'HTML' },
    )
  }

  game.registerTimeoutEvent(
    roomId,
    async () => handleTimeoutEvent(ctx, roomId),
    ANSWERS_TIMEOUT,
  )
}

// ------- [ text message ] ------- //

const checkSendTextMessageAvailability: TextMessageFn = async (ctx, next) => {
  if (ctx.chat.type !== 'private') return

  return next()
}

const handleSendMessageByHusband: TextMessageFn = async (ctx, next) => {
  const { text, from } = ctx.message

  if (game.isHusbandRole(from.id)) {
    if (text.length > MAX_HUSBAND_MESSAGE_LENGTH) {
      return Promise.all([
        ctx.react('🙈'),
        ctx.replyWithHTML(t('husband.send_message.too_long')),
      ])
    }

    const currentRoom = game.getRoomOfUser(from.id)

    if (!currentRoom) return

    const [roomId] = currentRoom

    return Promise.all([
      ctx.react(getRandomEmoji()),
      ctx.telegram.sendMessage(
        roomId,
        t('husband.send_message.base', { message: formattedTextForHTML(text) }),
        { parse_mode: 'HTML' },
      ),
    ])
  }

  return next()
}

const handleSendAnswer: TextMessageFn = async ctx => {
  const { text, from } = ctx.message

  if (text.length > MAX_ANSWER_LENGTH) {
    return Promise.all([
      ctx.react('🙈'),
      ctx.replyWithHTML(t('member.answer.too_long')),
    ])
  }

  const answered = game.setAnswerByMember(from.id, text)
  const currentRoom = game.getRoomOfUser(from.id)

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
  handleSendMessageByHusband,
  handleSendAnswer,
)

export default answersScene
