import {
  BOT_ACTIONS,
  BOT_COMMANDS,
  CLEAR_EXTEND_REGISTRATION_TIMEOUT,
  EXTEND_REGISTRATION_TIMEOUT,
  INLINE_KEYBOARD_PARTICIPATE,
  MIN_PARTICIPANTS_COUNT,
  PARTICIPATE_CALLBACK_ANSWERS,
  REGISTRATION_TIMEOUT,
  SCENES,
} from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import {
  mentionWithHTML,
  mentionsOfParticipants,
  remainsTime,
} from '@tools/formatting'
import { handleCatch } from '@tools/utils'
import { Scenes } from 'telegraf'
import type {
  ActionFn,
  BotContext,
  CommandContext,
  CommandFn,
  NextContext,
} from '../context'

// ------- [ command ] ------- //

const deleteMessageAndCheckPrivate: CommandFn = async ctx => {
  await ctx.deleteMessage()
  return ctx.chat.type === 'private'
}

const completeRegistration: CommandFn = async ctx => {
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
  const messageId = currentRoom.replyId

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
      { parse_mode: 'HTML' },
    )
    await ctx
      .unpinChatMessage(messageId)
      .catch(error => handleCatch(error, ctx))
  } catch (error) {
    handleCatch(error, ctx)
    await ctx.replyWithHTML(textMessage)
  }

  if (roomStatus === 'next_status') {
    await ctx.scene.enter(SCENES.search_husband)
  }
}

const checkStartGameAvailability: CommandFn = async (ctx, next) => {
  if (await deleteMessageAndCheckPrivate(ctx, next)) return

  if (!game.createRoom(ctx.chat.id)) {
    const { registration } = game.rooms.get(ctx.chat.id)!
    const { user: creator } = await ctx.telegram.getChatMember(
      ctx.chat.id,
      registration!.creatorId,
    )
    const textMessage = t('start_game.room_is_created', {
      ctx,
      creator: mentionWithHTML(creator),
    })

    return ctx.telegram.sendMessage(ctx.from.id, textMessage, {
      parse_mode: 'HTML',
    })
  }

  return next()
}

const checkGameAvailability = async (
  ctx: CommandContext,
  next: NextContext,
  action: 'start_now' | 'stop',
) => {
  if (await deleteMessageAndCheckPrivate(ctx, next)) return

  const currentRoom = game.rooms.get(ctx.chat.id)

  if (currentRoom?.status !== 'registration') return

  const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id)
  const isAdmin = admins.find(
    ({ user: { id: user_id } }) => user_id === ctx.from.id,
  )

  if (currentRoom.registration?.creatorId === ctx.from.id || isAdmin) {
    return next()
  }

  const { user: creator } = await ctx.telegram.getChatMember(
    ctx.chat.id,
    currentRoom.registration!.creatorId,
  )

  const actionText = action === 'start_now' ? 'start_game_now' : 'stop_game'
  const textMessage = t(`${actionText}.not_creator_or_admin`, {
    ctx,
    creator: mentionWithHTML(creator),
  })

  return ctx.telegram.sendMessage(ctx.from.id, textMessage, {
    parse_mode: 'HTML',
  })
}

const checkStartGameNowAvailability: CommandFn = async (ctx, next) => {
  return checkGameAvailability(ctx, next, 'start_now')
}

const checkStopGameAvailability: CommandFn = async (ctx, next) => {
  return checkGameAvailability(ctx, next, 'stop')
}

const onStartGame: CommandFn = async (ctx, next) => {
  const { message_id } = await ctx.replyWithHTML(
    t('start_game.base', { ctx }),
    INLINE_KEYBOARD_PARTICIPATE,
  )

  await ctx.pinChatMessage(message_id)
  await ctx.deleteMessage(message_id + 1)

  if (game.setMessageForRegistration(ctx.chat.id, ctx.from, message_id)) {
    game.registerTimeoutEvent(
      ctx.chat.id,
      async () => {
        await completeRegistration(ctx, next)
      },
      REGISTRATION_TIMEOUT,
    )
  }
}

const onStartGameNow: CommandFn = async (ctx, next) => {
  return completeRegistration(ctx, next)
}

const onStopGame: CommandFn = async ctx => {
  const chatId = ctx.chat.id
  const { replyId } = game.rooms.get(chatId)!
  const textMessage = t('stop_game.base', {
    ctx,
    user: mentionWithHTML(ctx.from),
  })

  try {
    await ctx.telegram.editMessageText(
      chatId,
      replyId,
      undefined,
      textMessage,
      { parse_mode: 'HTML' },
    )
    await ctx.unpinChatMessage(replyId).catch(error => handleCatch(error, ctx))
  } catch (error) {
    handleCatch(error, ctx)
    await ctx.replyWithHTML(textMessage)
  }

  game.closeRoom(chatId)
}

const onExtendGame: CommandFn = async (ctx, next) => {
  if (await deleteMessageAndCheckPrivate(ctx, next)) return

  const roomStatus = game.getRoomStatus(ctx.chat.id)

  if (roomStatus !== 'registration') return

  const remains = game.extendRegistrationTimeout(
    ctx.chat.id,
    async () => {
      await completeRegistration(ctx, next)
    },
    EXTEND_REGISTRATION_TIMEOUT,
  )

  if (remains <= 0) return

  const { message_id } = await ctx.replyWithHTML(
    t('extend_game.base', {
      extend: remainsTime(EXTEND_REGISTRATION_TIMEOUT),
      remains: remainsTime(remains),
    }),
  )

  const timeout = setTimeout(() => {
    ctx.deleteMessage(message_id).catch(error => handleCatch(error, ctx))
    clearTimeout(timeout)
  }, CLEAR_EXTEND_REGISTRATION_TIMEOUT)
}

// ------- [ action ] ------- //

const checkParticipationAvailability: ActionFn = async (ctx, next) => {
  if (!ctx.chat || ctx.chat?.type === 'private') return

  try {
    const chatWithBot = await ctx.telegram.getChat(ctx.from.id)

    if (chatWithBot.type !== 'private') {
      throw new Error('Missing chat started by participation with bot')
    }
  } catch (error) {
    handleCatch(error, ctx)
    return ctx.answerCbQuery(t('start.no_chat'), { show_alert: true })
  }

  return next()
}

const onParticipate: ActionFn = async ctx => {
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
      { parse_mode: 'HTML' },
    )
  } catch (error) {
    game.removeParticipantFromRoom(chatId, ctx.from)
    handleCatch(error, ctx)

    return ctx.answerCbQuery(t('answer_cb.participate.blocked_chat'), {
      show_alert: true,
    })
  }

  const currentRoom = game.rooms.get(chatId)!
  const textMessage = t('start_game.set_of_participants', {
    users: mentionsOfParticipants(currentRoom.participants),
    count: currentRoom.participants.size,
  })

  await ctx.editMessageText(textMessage, {
    parse_mode: 'HTML',
    reply_markup: INLINE_KEYBOARD_PARTICIPATE.reply_markup,
  })
}

// ------- [ scene ] ------- //

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
