import {
  BOT_ACTIONS,
  BOT_COMMANDS,
  EXTEND_REGISTRATION_TIMEOUT,
  INLINE_KEYBOARD_PARTICIPATE,
  MIN_PARTICIPANTS_COUNT,
  PARTICIPATE_CALLBACK_ANSWERS,
  REGISTRATION_TIMEOUT,
  SCENES,
} from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { ParseMode } from '@telegraf/types'
import {
  mentionWithMarkdownV2,
  mentionsOfParticipants,
  remainsTime,
} from '@tools/formatting'
import ms from 'ms'
import { Scenes } from 'telegraf'
import type {
  ActionContext,
  BotContext,
  CommandContext,
  NextContext,
} from '../context'

// ------- [ commands ] ------- //

const deleteMessageAndCheckPrivate = async (ctx: CommandContext) => {
  await ctx.deleteMessage()
  return ctx.chat.type === 'private'
}

const completeRegistration = async (ctx: CommandContext) => {
  if (ctx.chat.type === 'private') return

  const chatId = ctx.chat.id
  const currentRoom = game.rooms.get(chatId)
  const roomStatus = game.completeRegistration(chatId)

  if (
    roomStatus === 'room_not_exist' ||
    !currentRoom?.registration ||
    roomStatus === 'not_registration'
  ) {
    return
  }

  game.unregisterTimeoutEvent(chatId)

  let textMessage = ''
  const messageId = currentRoom.reply

  switch (roomStatus) {
    case 'not_enough_participants':
      textMessage = t('stop_game.not_enough_participants', {
        count: MIN_PARTICIPANTS_COUNT,
      })
      break
    case 'next_status':
      textMessage = t('start_game.next_status', { ctx })
      break
  }

  try {
    await ctx.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      textMessage,
      { parse_mode: 'MarkdownV2' },
    )
  } catch {
    await ctx.replyWithMarkdownV2(textMessage)
  }

  try {
    await ctx.unpinChatMessage(messageId)
  } catch {
    /* empty */
  }

  if (roomStatus === 'next_status') {
    await ctx.scene.enter(SCENES.search_husband)
  }
}

const checkStartGameAvailability = async (
  ctx: CommandContext,
  next: NextContext,
) => {
  if (await deleteMessageAndCheckPrivate(ctx)) return

  if (!game.createRoom(ctx.chat.id)) {
    const { registration } = game.rooms.get(ctx.chat.id)!

    const { user: creator } = await ctx.telegram.getChatMember(
      ctx.chat.id,
      registration!.creator_id,
    )
    const textMessage = t('start_game.room_is_created', {
      ctx,
      creator: mentionWithMarkdownV2(creator),
    })

    return ctx.telegram.sendMessage(ctx.from.id, textMessage, {
      parse_mode: 'MarkdownV2',
    })
  }

  return next()
}

const checkGameAvailability = async (
  ctx: CommandContext,
  next: NextContext,
  action: 'start_now' | 'stop',
) => {
  if (await deleteMessageAndCheckPrivate(ctx)) return

  const currentRoom = game.rooms.get(ctx.chat.id)

  if (currentRoom?.status !== 'registration') return

  const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id)
  const isAdmin = admins.find(
    ({ user: { id: user_id } }) => user_id === ctx.from.id,
  )

  if (currentRoom.registration?.creator_id === ctx.from.id || isAdmin) {
    return next()
  }

  const { user: creator } = await ctx.telegram.getChatMember(
    ctx.chat.id,
    currentRoom.registration!.creator_id,
  )

  const actionText = action === 'start_now' ? 'start_game_now' : 'stop_game'
  const textMessage = t(`${actionText}.not_creator_or_admin`, {
    ctx,
    creator: mentionWithMarkdownV2(creator),
  })

  return ctx.telegram.sendMessage(ctx.from.id, textMessage, {
    parse_mode: 'MarkdownV2',
  })
}

const checkStartGameNowAvailability = async (
  ctx: CommandContext,
  next: NextContext,
) => {
  return checkGameAvailability(ctx, next, 'start_now')
}

const checkStopGameAvailability = async (
  ctx: CommandContext,
  next: NextContext,
) => {
  return checkGameAvailability(ctx, next, 'stop')
}

const onStartGame = async (ctx: CommandContext) => {
  const { message_id } = await ctx.replyWithMarkdownV2(
    t('start_game.base', { ctx }),
    INLINE_KEYBOARD_PARTICIPATE,
  )

  await ctx.pinChatMessage(message_id)
  await ctx.deleteMessage(message_id + 1)

  if (game.setMessageForRegistration(ctx.chat.id, ctx.from, message_id)) {
    game.registerTimeoutEvent(
      ctx.chat.id,
      async () => await completeRegistration(ctx),
      REGISTRATION_TIMEOUT,
    )
  }
}

const onStartGameNow = async (ctx: CommandContext) => {
  return completeRegistration(ctx)
}

const onStopGame = async (ctx: CommandContext) => {
  const chatId = ctx.chat.id
  const { reply } = game.rooms.get(chatId)!

  try {
    await ctx.telegram.editMessageText(
      chatId,
      reply,
      undefined,
      t('stop_game.base', { ctx, user: mentionWithMarkdownV2(ctx.from) }),
      { parse_mode: 'MarkdownV2' },
    )
  } catch {
    await ctx.replyWithMarkdownV2(t('stop_game.base', { ctx }))
  }

  try {
    await ctx.unpinChatMessage(reply)
  } catch {
    /* empty */
  }

  game.closeRoom(chatId)
}

const onExtendGame = async (ctx: CommandContext) => {
  if (await deleteMessageAndCheckPrivate(ctx)) return

  const roomStatus = game.getRoomStatus(ctx.chat.id)

  if (roomStatus !== 'registration') return

  const remains = game.extendRegistrationTimeout(
    ctx.chat.id,
    async () => await completeRegistration(ctx),
    EXTEND_REGISTRATION_TIMEOUT,
  )

  if (remains <= 0) return

  const { message_id } = await ctx.replyWithMarkdownV2(
    t('extend_game.base', {
      extend: remainsTime(EXTEND_REGISTRATION_TIMEOUT),
      remains: remainsTime(remains),
    }),
  )

  const timeout = setTimeout(() => {
    try {
      ctx.deleteMessage(message_id)
    } catch {
      /* empty */
    }

    clearTimeout(timeout)
  }, ms('7s'))
}

// ------- [ actions ] ------- //

const checkParticipationAvailability = async (
  ctx: ActionContext,
  next: NextContext,
) => {
  if (!ctx.chat || ctx.chat?.type === 'private') return

  try {
    const chatWithBot = await ctx.telegram.getChat(ctx.from.id)

    if (chatWithBot.type !== 'private') {
      throw new Error('Missing chat started by participation with bot')
    }
  } catch {
    return ctx.answerCbQuery(t('start.no_chat'), { show_alert: true })
  }

  return next()
}

const onParticipate = async (ctx: ActionContext) => {
  const chatId = ctx.chat!.id
  const roomStatus = game.addParticipantToRoom(chatId, ctx.from)

  if (roomStatus !== 'participant_added') {
    return ctx.answerCbQuery(PARTICIPATE_CALLBACK_ANSWERS[roomStatus], {
      show_alert: true,
    })
  }

  try {
    await ctx.telegram.sendMessage(
      ctx.from.id,
      t('answer_cb.participate.participant_added', { ctx }),
      { parse_mode: 'MarkdownV2' },
    )
  } catch {
    game.removeParticipantFromRoom(chatId, ctx.from)

    return ctx.answerCbQuery(t('answer_cb.participate.blocked_chat'), {
      show_alert: true,
    })
  }

  const currentRoom = game.rooms.get(chatId)!
  const textMessage = t('start_game.set_of_participants', {
    users: mentionsOfParticipants(currentRoom.participants),
    count: currentRoom.participants.size,
  })
  const extraProps = {
    parse_mode: 'MarkdownV2' as ParseMode,
    reply_markup: INLINE_KEYBOARD_PARTICIPATE.reply_markup,
  }

  await ctx.editMessageText(textMessage, extraProps)
}

// ------- [ Scene ] ------- //

const registrationScene = new Scenes.BaseScene<BotContext>(SCENES.registration)

registrationScene.command(
  BOT_COMMANDS.start_game,
  checkStartGameAvailability,
  onStartGame,
)
registrationScene.command(
  BOT_COMMANDS.start_game_now,
  checkStartGameNowAvailability,
  onStartGameNow,
)
registrationScene.command(
  BOT_COMMANDS.stop_game,
  checkStopGameAvailability,
  onStopGame,
)
registrationScene.command(BOT_COMMANDS.extend_game, onExtendGame)

registrationScene.action(
  BOT_ACTIONS.participate,
  checkParticipationAvailability,
  onParticipate,
)

export default registrationScene
