import { BOT_ACTIONS, INLINE_KEYBOARD_ELIMINATION, SCENES } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { Participant } from '@models/roles'
import type { Chat, MessageId, User } from '@telegraf/types'
import { mentionWithHTML } from '@tools/formatting'
import { getRandomText } from '@tools/utils'
import { Scenes } from 'telegraf'
import { callbackQuery } from 'telegraf/filters'
import type {
  BotContext,
  CallbackQueryDataContext,
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

  await ctx.telegram.sendMessage(husbandId, textMessage, {
    reply_markup: INLINE_KEYBOARD_ELIMINATION(members, canSkip).reply_markup,
    parse_mode: 'HTML',
  })

  // TODO:
  // game.registerTimeoutEvent(chatId, async () => {}, ELIMINATION_TIMEOUT)
}

const handleElimination = async (
  ctx: BotContext,
  chatId: Chat['id'],
  skipped: boolean,
) => {
  // TODO:
  // game.unregisterTimeoutEvent(chatId)

  const { replyId, participants, eliminatedParticipantId } =
    game.allRooms.get(chatId)!
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
    const eliminatedParticipant = participants.get(eliminatedParticipantId!)

    if (eliminatedParticipant?.role === 'member') {
      const firstMember = members[0][1]
      const [, husband] = game.getHusbandInGame(chatId)!

      if (members.length === 0) {
        gameFinished = true
        eliminationMessage = t('elimination.final.all_afk', {
          husband: mentionWithHTML(husband.user),
        })
      } else {
        const eliminatedText = getRandomText(
          t('comments.elimination.accept', { returnObjects: true }),
        )

        if (members.length === 1 && firstMember.role === 'member') {
          gameFinished = true
          eliminationMessage = t('elimination.final.winner', {
            eliminated_number: eliminatedParticipant.number,
            eliminated: mentionWithHTML(eliminatedParticipant.user),
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
            number: eliminatedParticipant.number,
            user: mentionWithHTML(eliminatedParticipant.user),
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

// ------- [ callback query ] ------- //

const handleCallbackQueryChoose: CallbackQueryDataFn = async ctx => {
  const userId = ctx.from.id
  const currentRoom = game.getRoomOfUser(userId)

  if (!currentRoom) return

  const [roomId] = currentRoom
  const data = ctx.callbackQuery.data

  await ctx.telegram.editMessageText(
    userId,
    ctx.callbackQuery.message!.message_id,
    undefined,
    t('husband.elimination.chosen_one'),
    { parse_mode: 'HTML' },
  )

  if (data === BOT_ACTIONS.skip_elimination) {
    return handleSkipElimination(ctx, roomId)
  }

  if (!Number.isNaN(data)) {
    return handleChooseElimination(ctx, roomId, +data)
  }
}

const handleSkipElimination = async (
  ctx: CallbackQueryDataContext,
  chatId: Chat['id'],
) => {
  game.skipElimination(chatId)
  await handleElimination(ctx, chatId, true)
}

const handleChooseElimination = async (
  ctx: CallbackQueryDataContext,
  chatId: Chat['id'],
  memberId: User['id'],
) => {
  game.eliminateMember(chatId, memberId)
  await handleElimination(ctx, chatId, false)
}

// ------- [ scene ] ------- //

const eliminationScene = new Scenes.BaseScene<BotContext>(SCENES.elimination)

eliminationScene.enter(startElimination)

eliminationScene.on<GuardCallbackQueryDataFn>(
  callbackQuery('data'),
  handleCallbackQueryChoose,
)

export default eliminationScene
