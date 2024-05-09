import { INLINE_KEYBOARD_CHAT_WITH_BOT, SCENES } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { ParseMode } from '@telegraf/types'
import { answerOfMembers } from '@tools/formatting'
import { getRandomEmoji } from '@tools/utils'
import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import type { BotContext, NextContext, TextMessageContext } from '../context'

// ------- [ enter ] ------- //

const requestForAnswers = async (ctx: BotContext) => {
  let chatId = ctx.chat!.id

  if (ctx.chat?.type === 'private') {
    const currentRoom = game.getRoomOfUser(ctx.chat.id)

    if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

    chatId = currentRoom[0]
  }

  const members = game.getParticipantsInGame(chatId)
  const husband = game.getHusbandInGame(chatId)

  for (const [memberId] of members) {
    await ctx.telegram.sendMessage(memberId, t('member.answer'), {
      parse_mode: 'MarkdownV2',
    })
  }

  if (husband) {
    await ctx.telegram.sendMessage(husband[0], t('husband.ask_send_message'), {
      parse_mode: 'MarkdownV2',
    })
  }
}

// ------- [ text messages ] ------- //

const completeAnswers = async (ctx: TextMessageContext) => {
  const currentRoom = game.getRoomOfUser(ctx.message.from.id)

  if (!currentRoom) return

  const [roomId, room] = currentRoom
  const participants = game.getParticipantsInGame(roomId)

  const textMessage = answerOfMembers(participants, room.answers)
  const extraProps = {
    reply_markup: INLINE_KEYBOARD_CHAT_WITH_BOT(ctx.botInfo.username)
      .reply_markup,
    parse_mode: 'HTML' as ParseMode,
    reply_parameters: {
      message_id: room.question!.message_id,
      chat_id: roomId,
      allow_sending_without_reply: true,
    },
  }

  await ctx.telegram.sendMessage(roomId, textMessage, extraProps)
  game.clearAnswers(roomId)
  game.completeMemberAnswers(roomId)

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

  if (game.everyoneAnswered(currentRoom[0])) {
    return completeAnswers(ctx)
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
