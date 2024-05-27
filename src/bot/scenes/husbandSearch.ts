import {
  ACCEPT_HUSBAND_ROLE_TIMEOUT,
  BOT_ACTIONS,
  INLINE_KEYBOARD_ROLE,
  SCENES,
} from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { Chat, Message, User } from '@telegraf/types'
import { Scenes } from 'telegraf'
import type { ActionContext, BotContext } from '../context'

// ------- [ enter ] ------- //

const searchHusband = async (ctx: BotContext) => {
  if (!ctx.from) return ctx.scene.reset()

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

  const [chatId] = currentRoom
  const [participantId, { user }] = game.getRandomRequestHusbandRole(chatId)

  const { message_id } = await ctx.telegram.sendMessage(
    participantId,
    t('husband.search'),
    {
      parse_mode: 'MarkdownV2',
      reply_markup: INLINE_KEYBOARD_ROLE.reply_markup,
    },
  )
  const nextUserCtx = {
    ...ctx,
    from: user,
    chat: { id: participantId, type: 'private' },
  } as BotContext

  game.registerTimeoutEvent(
    chatId,
    async () => onTimeoutEvent(nextUserCtx, participantId, message_id),
    ACCEPT_HUSBAND_ROLE_TIMEOUT,
  )
}

// ------- [ actions ] ------- //

const onTimeoutEvent = async (
  ctx: BotContext,
  userId: User['id'],
  messageId: Message['message_id'],
) => {
  await Promise.all([
    ctx.telegram.editMessageText(
      userId,
      messageId,
      undefined,
      t('husband.afk_deny_role'),
      {
        parse_mode: 'MarkdownV2',
      },
    ),
    onPickHusbandRole(ctx, false),
  ])
}

const sendMessageToParticipations = async (
  ctx: BotContext,
  chatId: Chat['id'],
) => {
  const { participants } = game.rooms.get(chatId)!

  for (const [participantId, participant] of participants) {
    if (participant.role !== 'member' || participant.afk) continue

    await ctx.telegram.sendMessage(
      participantId,
      t('member.welcome', { number: participant.number }),
      {
        parse_mode: 'MarkdownV2',
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

const onPickHusbandRole = async (ctx: BotContext, accepted: boolean) => {
  const currentRoom = game.getRoomOfUser(ctx.from!.id)

  if (!currentRoom) {
    return
  }

  const [chatId] = currentRoom
  const status = game.acceptHusbandRole(chatId, ctx.from!, accepted)

  game.unregisterTimeoutEvent(chatId)

  switch (status) {
    case 'accept':
      return completeHusbandSearch(ctx, chatId)
    case 'deny': {
      const allCanceled = game.allСanceledHusbandRole(chatId)
      if (!allCanceled) {
        return searchHusband(ctx)
      }

      const [husbandId, { user }] = game.getRandomRequestHusbandRole(chatId)

      game.acceptHusbandRole(chatId, user, true)

      await ctx.telegram.sendMessage(husbandId, t('husband.random_role'), {
        parse_mode: 'MarkdownV2',
      })

      return completeHusbandSearch(ctx, chatId)
    }
  }
}

export const onAcceptHusbandRole = async (ctx: ActionContext) => {
  await ctx.editMessageText(t('husband.accept_role'), {
    parse_mode: 'MarkdownV2',
  })
  return onPickHusbandRole(ctx, true)
}

export const onDenyHusbandRole = async (ctx: ActionContext) => {
  await ctx.editMessageText(t('husband.deny_role'), {
    parse_mode: 'MarkdownV2',
  })
  return onPickHusbandRole(ctx, false)
}

// ------- [ Scene ] ------- //

const husbandSearchScene = new Scenes.BaseScene<BotContext>(
  SCENES.search_husband,
)

husbandSearchScene.enter(searchHusband)

husbandSearchScene.action(BOT_ACTIONS.accept_husband_role, onAcceptHusbandRole)
husbandSearchScene.action(BOT_ACTIONS.deny_husband_role, onDenyHusbandRole)

export default husbandSearchScene
