import { BOT_ACTIONS, INLINE_KEYBOARD_ROLE, SCENES } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { Chat } from '@telegraf/types'
import { Scenes } from 'telegraf'
import type { ActionContext, BotContext } from '../context'

// ------- [ commands ] ------- //

const searchHusband = async (ctx: BotContext) => {
  let chatId = ctx.chat!.id

  if (ctx.chat?.type === 'private') {
    const currentRoom = game.getRoomOfUser(ctx.chat.id)

    if (!currentRoom) {
      // TODO: ops не вдалось створити кімнату
      return ctx.scene.reset()
    }

    chatId = currentRoom[0]
  }

  const [user_id] = game.getRandomRequestHusbandRole(chatId)

  await ctx.telegram.sendMessage(user_id, t('husband.search'), {
    parse_mode: 'MarkdownV2',
    reply_markup: INLINE_KEYBOARD_ROLE.reply_markup,
  })
}

// ------- [ actions ] ------- //

const completeHusbandSearch = async (
  ctx: ActionContext,
  chatId: Chat['id'],
) => {
  game.assignRandomNumberToMembers(chatId)
  game.completeHusbandSearch(chatId)

  await ctx.scene.enter(SCENES.question)
}

const onPickHusbandRole = async (ctx: ActionContext, accepted: boolean) => {
  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) {
    return
  }

  const [chat_id] = currentRoom
  const status = game.acceptHusbandRole(chat_id, ctx.from, accepted)

  switch (status) {
    case 'accept':
      return completeHusbandSearch(ctx, currentRoom[0])
    case 'deny': {
      const allCanceled = game.allСanceledHusbandRole(chat_id)
      if (!allCanceled) {
        return searchHusband(ctx)
      }

      const [husband_id, husband] = game.getRandomRequestHusbandRole(chat_id)

      game.acceptHusbandRole(chat_id, husband.user, true)

      await ctx.telegram.sendMessage(husband_id, t('husband.random_role'), {
        parse_mode: 'MarkdownV2',
      })

      return completeHusbandSearch(ctx, chat_id)
    }
  }
}

export const onAcceptHusbandRole = async (ctx: ActionContext) => {
  await ctx.editMessageText(t('husband.accept_role'), {
    parse_mode: 'MarkdownV2',
  })
  onPickHusbandRole(ctx, true)
}

export const onDenyHusbandRole = async (ctx: ActionContext) => {
  await ctx.editMessageText(t('husband.deny_role'), {
    parse_mode: 'MarkdownV2',
  })
  onPickHusbandRole(ctx, false)
}

// ------- [ Scene ] ------- //

const husbandSearchScene = new Scenes.BaseScene<BotContext>(
  SCENES.husband_search,
)

husbandSearchScene.enter(async (ctx, next) => {
  await searchHusband(ctx)
  return next()
})

husbandSearchScene.action(BOT_ACTIONS.accept_husband_role, onAcceptHusbandRole)
husbandSearchScene.action(BOT_ACTIONS.deny_husband_role, onDenyHusbandRole)

export default husbandSearchScene
