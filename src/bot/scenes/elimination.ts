import {
  BOT_ACTIONS,
  ELIMINATION_TIMEOUT,
  INLINE_KEYBOARD_ELIMINATION,
  SCENES,
} from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { Participant } from '@models/roles'
import type { Chat, MessageId, User } from '@telegraf/types'
import { mentionWithHTML } from '@tools/formatting'
import { getRandomText, handleCatch } from '@tools/utils'
import { Scenes } from 'telegraf'
import { callbackQuery } from 'telegraf/filters'
import type {
  BotContext,
  CallbackQueryDataFn,
  ContextFn,
  GuardCallbackQueryDataFn,
} from '../context'

// ------- [ utility functions ] ------- //

const sendMessage = async (
  ctx: BotContext,
  chatId: Chat['id'],
  message: string,
  replyId?: MessageId['message_id'],
) => {
  return ctx.telegram.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    reply_parameters: replyId
      ? { message_id: replyId, allow_sending_without_reply: true }
      : undefined,
  })
}

const editMessageText = async (
  ctx: BotContext,
  userId: User['id'],
  messageId: MessageId['message_id'],
  message: string,
) => {
  try {
    await ctx.telegram.editMessageText(userId, messageId, undefined, message, {
      parse_mode: 'HTML',
    })
  } catch (error) {
    handleCatch(error, ctx)
    await sendMessage(ctx, userId, message)
  }
}

const handleTimeoutEvent = async (
  ctx: BotContext,
  chatId: Chat['id'],
  husbandId: User['id'],
) => {
  const { elimination } = game.allRooms.get(chatId)!

  if (!elimination) return

  await editMessageText(
    ctx,
    husbandId,
    elimination.messageId,
    t('husband.elimination.chosen_afk'),
  )

  const memberId = game.getMemberForElimination(chatId)

  if (memberId) {
    return handleChooseElimination(ctx, chatId, memberId)
  }

  await handleSkipElimination(ctx, chatId)
}

const registerTimeoutEvent = (
  ctx: BotContext,
  chatId: Chat['id'],
  husbandId: User['id'],
) => {
  game.registerTimeoutEvent(
    chatId,
    async () => handleTimeoutEvent(ctx, chatId, husbandId),
    ELIMINATION_TIMEOUT,
  )
}

// ------- [ bot context ] ------- //

const startElimination: ContextFn = async ctx => {
  if (!ctx.from) return ctx.scene.reset()

  const currentRoom = game.getRoomOfUser(ctx.from.id)
  if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

  const [roomId] = currentRoom
  const members = game.getMembersInGame(roomId)

  if (members.length === 0) {
    return handleAllAFKElimination(ctx, roomId)
  }

  if (members.length === 1) {
    return handleSingleWinnerElimination(ctx, roomId, members[0][1])
  }

  return handleContinueElimination(ctx, roomId, members)
}

const handleAllAFKElimination = async (ctx: BotContext, chatId: Chat['id']) => {
  const { replyId } = game.allRooms.get(chatId)!
  const [, husband] = game.getHusbandInGame(chatId)!

  const textMessage = t('elimination.final.all_afk', {
    husband: mentionWithHTML(husband.user),
  })

  game.completeElimination(chatId, true)

  await sendMessage(ctx, chatId, textMessage, replyId)
  await ctx.scene.enter(SCENES.finished)
}

const handleSingleWinnerElimination = async (
  ctx: BotContext,
  chatId: Chat['id'],
  participant: Participant,
) => {
  const { replyId } = game.allRooms.get(chatId)!
  const [, husband] = game.getHusbandInGame(chatId)!

  const textMessage = t('elimination.final.one_remained', {
    husband: mentionWithHTML(husband.user),
    number: participant.role === 'member' ? participant.number : 0,
    user: mentionWithHTML(participant.user),
    details: getRandomText(t('comments.union', { returnObjects: true })),
  })

  game.completeElimination(chatId, true)

  await sendMessage(ctx, chatId, textMessage, replyId)
  await ctx.scene.enter(SCENES.finished)
}

const handleContinueElimination = async (
  ctx: BotContext,
  chatId: Chat['id'],
  members: [User['id'], Participant][],
) => {
  const currentRoom = game.allRooms.get(chatId)!
  const [husbandId] = game.getHusbandInGame(chatId)!

  const canSkip = currentRoom.numberOfSkips > 0
  const textMessage = `${t('husband.elimination.ask')}${canSkip ? t('husband.elimination.can_skip', { amount: currentRoom.numberOfSkips }) : ''}`

  const { message_id } = await ctx.telegram.sendMessage(
    husbandId,
    textMessage,
    {
      reply_markup: INLINE_KEYBOARD_ELIMINATION(members, canSkip).reply_markup,
      parse_mode: 'HTML',
    },
  )

  game.setEliminationQueryMessage(chatId, message_id)
  registerTimeoutEvent(ctx, chatId, husbandId)
}

const handleElimination = async (
  ctx: BotContext,
  chatId: Chat['id'],
  skipped: boolean,
) => {
  game.unregisterTimeoutEvent(chatId)

  const { replyId, participants, elimination } = game.allRooms.get(chatId)!
  const members = game.getMembersInGame(chatId)

  let eliminationMessage = ''
  let gameFinished = false

  if (skipped) {
    eliminationMessage = t('elimination.skipped', {
      details: getRandomText(
        t('comments.elimination.skipped', { returnObjects: true }),
      ),
    })
  } else {
    const eliminatedMember = participants.get(elimination!.eliminatedMemberId!)

    if (eliminatedMember?.role === 'member') {
      const [, husband] = game.getHusbandInGame(chatId)!

      if (members.length === 0) {
        gameFinished = true
        eliminationMessage = t('elimination.final.all_afk', {
          husband: mentionWithHTML(husband.user),
        })
      } else {
        const firstMember = members[0][1]
        const eliminatedText = getRandomText(
          t('comments.elimination.accept', { returnObjects: true }),
        )

        if (members.length === 1 && firstMember.role === 'member') {
          gameFinished = true
          eliminationMessage = t('elimination.final.winner', {
            eliminated_number: eliminatedMember.number,
            eliminated: mentionWithHTML(eliminatedMember.user),
            eliminated_info: eliminatedText,
            husband: mentionWithHTML(husband.user),
            number: firstMember.number,
            user: mentionWithHTML(firstMember.user),
            details: getRandomText(
              t('comments.union', { returnObjects: true }),
            ),
          })
        } else {
          eliminationMessage = t('elimination.accept', {
            number: eliminatedMember.number,
            user: mentionWithHTML(eliminatedMember.user),
            details: eliminatedText,
          })
        }
      }
    }
  }

  await sendMessage(ctx, chatId, eliminationMessage, replyId)

  if (!skipped && members.length === 2) {
    await sendMessage(ctx, chatId, t('elimination.alert.final'))
  }

  game.completeElimination(chatId, gameFinished)

  await ctx.scene.enter(SCENES[gameFinished ? 'finished' : 'question'])
}

const handleSkipElimination = async (ctx: BotContext, chatId: Chat['id']) => {
  game.skipElimination(chatId)
  await handleElimination(ctx, chatId, true)
}

const handleChooseElimination = async (
  ctx: BotContext,
  chatId: Chat['id'],
  memberId: User['id'],
) => {
  game.eliminateMember(chatId, memberId)
  await handleElimination(ctx, chatId, false)
}

// ------- [ callback query ] ------- //

const handleCallbackQueryChoose: CallbackQueryDataFn = async ctx => {
  const userId = ctx.from.id
  const currentRoom = game.getRoomOfUser(userId)

  if (!currentRoom) return

  const [roomId, { elimination }] = currentRoom
  const data = ctx.callbackQuery.data

  await editMessageText(
    ctx,
    userId,
    elimination!.messageId!,
    t('husband.elimination.chosen_one'),
  )

  if (data === BOT_ACTIONS.skip_elimination) {
    return handleSkipElimination(ctx, roomId)
  }

  if (Number.isInteger(data)) {
    return handleChooseElimination(ctx, roomId, +data)
  }
}

// ------- [ scene ] ------- //

const eliminationScene = new Scenes.BaseScene<BotContext>(SCENES.elimination)

eliminationScene.enter(startElimination)

eliminationScene.on<GuardCallbackQueryDataFn>(
  callbackQuery('data'),
  handleCallbackQueryChoose,
)

export default eliminationScene
