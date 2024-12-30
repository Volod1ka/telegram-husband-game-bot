import { getInlineKeyboardRole } from '@constants/inlineKeyboard'
import { BOT_ACTIONS } from '@constants/interactive'
import { ACCEPT_HUSBAND_ROLE_TIMEOUT } from '@constants/properties'
import { SCENES } from '@constants/scene'
import game from '@game/engine'
import { t } from '@i18n'
import type { Chat, Message, User } from '@telegraf/types'
import { handleCatch } from '@tools/utils'
import { Scenes } from 'telegraf'
import type { ActionFn, BotContext } from '../context'

// ------- [ utility functions ] ------- //

const handleTimeoutEvent = async (
  ctx: BotContext,
  userId: User['id'],
  messageId: Message['message_id'],
) => {
  await Promise.all([
    ctx.telegram
      .editMessageText(
        userId,
        messageId,
        undefined,
        t('husband.afk_deny_role'),
        { parse_mode: 'HTML' },
      )
      .catch(error => handleCatch(error, ctx)),
    handlePickHusbandRole(ctx, false),
  ])
}

// ------- [ bot context ] ------- //

const searchHusband = async (ctx: BotContext) => {
  if (!ctx.from) {
    return ctx.scene.reset()
  }

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) {
    // TODO: Unfortunately, the room could not be created
    return ctx.scene.reset()
  }

  const [roomId] = currentRoom
  const [participantId, { user }] = game.getRandomRequestHusbandRole(roomId)

  const { message_id } = await ctx.telegram.sendMessage(
    participantId,
    t('husband.search'),
    {
      parse_mode: 'HTML',
      reply_markup: getInlineKeyboardRole.reply_markup,
    },
  )
  const nextUserCtx = {
    ...ctx,
    from: user,
    chat: { id: participantId, type: 'private' },
  } as BotContext

  game.registerTimeoutEvent(
    roomId,
    async () => handleTimeoutEvent(nextUserCtx, participantId, message_id),
    ACCEPT_HUSBAND_ROLE_TIMEOUT,
  )
}

const sendMessageToParticipations = async (
  ctx: BotContext,
  chatId: Chat['id'],
) => {
  const { participants } = game.allRooms.get(chatId)!

  for (const [participantId, participant] of participants) {
    if (participant.role !== 'member' || participant.afk) {
      continue
    }

    await ctx.telegram.sendMessage(
      participantId,
      t('member.welcome', { number: participant.number }),
      {
        parse_mode: 'HTML',
      },
    )
  }
}

const completeHusbandSearch = async (ctx: BotContext, chatId: Chat['id']) => {
  game.assignRandomNumberToMembers(chatId)
  game.sortMembersByNumber(chatId)
  await sendMessageToParticipations(ctx, chatId)
  game.completeHusbandSearch(chatId)

  await ctx.scene.enter(SCENES.question)
}

const handlePickHusbandRole = async (ctx: BotContext, accepted: boolean) => {
  const currentRoom = game.getRoomOfUser(ctx.from!.id)

  if (!currentRoom) {
    return
  }

  const [roomId] = currentRoom
  const status = game.acceptHusbandRole(roomId, ctx.from!, accepted)

  game.unregisterTimeoutEvent(roomId)

  if (status === 'accept') {
    return completeHusbandSearch(ctx, roomId)
  }

  if (status === 'deny') {
    const allCanceled = game.allСanceledHusbandRole(roomId)

    if (!allCanceled) {
      return searchHusband(ctx)
    }

    const [husbandId, { user }] = game.getRandomRequestHusbandRole(roomId)

    game.acceptHusbandRole(roomId, user, true)

    await Promise.all([
      ctx.telegram
        .sendDice(husbandId, { emoji: '🎲' })
        .catch(error => handleCatch(error, ctx)),
      ctx.telegram
        .sendMessage(husbandId, t('husband.random_role'), {
          parse_mode: 'HTML',
        })
        .catch(error => handleCatch(error, ctx)),
      completeHusbandSearch(ctx, roomId),
    ])
  }
}

// ------- [ action ] ------- //

export const handleAcceptHusbandRole: ActionFn = async ctx => {
  await ctx.editMessageText(t('husband.accept_role'), {
    parse_mode: 'HTML',
  })
  return handlePickHusbandRole(ctx, true)
}

export const handleDenyHusbandRole: ActionFn = async ctx => {
  await ctx.editMessageText(t('husband.deny_role'), {
    parse_mode: 'HTML',
  })
  return handlePickHusbandRole(ctx, false)
}

// ------- [ scene ] ------- //

const husbandSearchScene = new Scenes.BaseScene<BotContext>(
  SCENES.search_husband,
)

husbandSearchScene.enter(searchHusband)

husbandSearchScene.action(
  BOT_ACTIONS.accept_husband_role,
  handleAcceptHusbandRole,
)
husbandSearchScene.action(BOT_ACTIONS.deny_husband_role, handleDenyHusbandRole)

export default husbandSearchScene
