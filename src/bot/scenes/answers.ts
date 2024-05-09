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

  for (const [memberId] of members) {
    await ctx.telegram.sendMessage(memberId, t('member.answer'), {
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

const checkSendAnswerAvailability = async (
  ctx: TextMessageContext,
  next: NextContext,
) => {
  if (ctx.chat.type !== 'private') return

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
  async (ctx, next) => checkSendAnswerAvailability(ctx, next),
  async ctx => onSendAnswer(ctx),
)

export default answersScene
