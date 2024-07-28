import {
  AUTO_CLEAR_MESSAGE_TIMEOUT,
  BOT_ACTIONS,
  BOT_COMMANDS,
  EXTEND_REGISTRATION_TIMEOUT,
  INLINE_KEYBOARD_PARTICIPATE,
  MAX_PARTICIPANTS_AMOUNT,
  MIN_PARTICIPANTS_AMOUNT,
  PARTICIPATE_CALLBACK_ANSWERS,
  REGISTRATION_REMIND_TIMEOUT,
  REGISTRATION_TIMEOUT,
  SCENES,
} from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import type { MessageId } from '@telegraf/types'
import {
  formattedChatTitleForHTML,
  mentionWithHTML,
  mentionsOfParticipants,
  remainsTime,
} from '@tools/formatting'
import { handleCatch, logHandleInfo } from '@tools/utils'
import { Scenes } from 'telegraf'
import type {
  ActionFn,
  BotContext,
  CommandContext,
  CommandFn,
  ContextFn,
  NextContext,
} from '../context'

// ------- [ utility functions ] ------- //

const autoClearMessage = (
  ctx: BotContext,
  messageId: MessageId['message_id'],
) => {
  const timeout = setTimeout(async () => {
    await ctx.deleteMessage(messageId).catch(error => handleCatch(error, ctx))
    clearTimeout(timeout)
  }, AUTO_CLEAR_MESSAGE_TIMEOUT)
}

const registrationRemind = async (ctx: BotContext) => {
  const { message_id } = await ctx.replyWithHTML(
    t('start_game.remind_timeout', {
      time: remainsTime(undefined, REGISTRATION_REMIND_TIMEOUT),
    }),
  )

  autoClearMessage(ctx, message_id)
}

// ------- [ bot context ] ------- //

const completeRegistration: ContextFn = async ctx => {
  if (!ctx.chat || ctx.chat.type === 'private') return

  const chatId = ctx.chat.id
  const chatTitle = formattedChatTitleForHTML(ctx.chat)
  const currentRoom = game.allRooms.get(chatId)
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
        amount: MIN_PARTICIPANTS_AMOUNT,
      })
      break
    case 'next_status':
      textMessage = t('start_game.next_status', { chat_title: chatTitle })
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
    logHandleInfo(t('log.game.start', { chat_id: chatId }), ctx)
    await ctx.scene.enter(SCENES.search_husband)
  }
}

// ------- [ command ] ------- //

const deleteMessageAndCheckPrivate: CommandFn = async ctx => {
  await ctx.deleteMessage()
  return ctx.chat.type === 'private'
}

const checkStartGameAvailability: CommandFn = async (ctx, next) => {
  if (await deleteMessageAndCheckPrivate(ctx, next)) return

  if (!game.createRoom(ctx.chat.id)) {
    const { registration } = game.allRooms.get(ctx.chat.id)!
    const { user: creator } = await ctx.telegram.getChatMember(
      ctx.chat.id,
      registration!.creatorId,
    )
    const textMessage = t('start_game.room_is_created', {
      chat_title: formattedChatTitleForHTML(ctx.chat),
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

  const currentRoom = game.allRooms.get(ctx.chat.id)

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
    chat_title: formattedChatTitleForHTML(ctx.chat),
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

const handleStartGame: CommandFn = async (ctx, next) => {
  const chatId = ctx.chat.id
  const { message_id } = await ctx.replyWithHTML(
    t('start_game.base', { chat_title: formattedChatTitleForHTML(ctx.chat) }),
    INLINE_KEYBOARD_PARTICIPATE(ctx.botInfo.username),
  )

  await ctx.pinChatMessage(message_id)
  await ctx.deleteMessage(message_id + 1)

  if (game.setMessageForRegistration(chatId, ctx.from, message_id)) {
    game.registerTimeoutEvent(
      chatId,
      async () => {
        await completeRegistration(ctx, next)
      },
      REGISTRATION_TIMEOUT,
      {
        callback: async () => {
          await registrationRemind(ctx)
        },
        timeoutMs: REGISTRATION_REMIND_TIMEOUT,
      },
    )
  }

  logHandleInfo(t('log.game.registration', { chat_id: chatId }), ctx)
}

const handleStartGameNow: CommandFn = async (ctx, next) => {
  return completeRegistration(ctx, next)
}

const handleStopGame: CommandFn = async ctx => {
  const chatId = ctx.chat.id
  const { replyId } = game.allRooms.get(chatId)!
  const textMessage = t('stop_game.base', {
    chat_title: formattedChatTitleForHTML(ctx.chat),
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

  logHandleInfo(t('log.game.stop', { chat_id: chatId }), ctx)
  game.closeRoom(chatId)
}

const handleExtendGame: CommandFn = async (ctx, next) => {
  if (await deleteMessageAndCheckPrivate(ctx, next)) return

  const roomStatus = game.getRoomStatus(ctx.chat.id)

  if (roomStatus !== 'registration') return

  const remains = game.extendRegistrationTimeout(
    ctx.chat.id,
    EXTEND_REGISTRATION_TIMEOUT,
  )

  if (remains <= 0) return

  const { message_id } = await ctx.replyWithHTML(
    t('extend_game.base', {
      extend: remainsTime(undefined, EXTEND_REGISTRATION_TIMEOUT),
      remains: remainsTime(undefined, remains),
    }),
  )

  autoClearMessage(ctx, message_id)
}

// ------- [ action ] ------- //

const checkParticipationAvailability: ActionFn = async (ctx, next) => {
  if (!ctx.chat || ctx.chat?.type === 'private') return

  return next()
}

const handleParticipate: ActionFn = async (ctx, next) => {
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
      t('answer_cb.participate.participant_added', {
        chat_title: formattedChatTitleForHTML(ctx.chat!),
        user: mentionWithHTML(ctx.from),
      }),
      { parse_mode: 'HTML' },
    )
  } catch (error) {
    game.removeParticipantFromRoom(chatId, ctx.from)
    handleCatch(error, ctx)

    return ctx.answerCbQuery(t('answer_cb.participate.blocked_chat'), {
      show_alert: true,
    })
  }

  const currentRoom = game.allRooms.get(chatId)!

  if (currentRoom.participants.size >= MAX_PARTICIPANTS_AMOUNT) {
    return completeRegistration(ctx, next)
  }

  const textMessage = t('start_game.set_of_participants', {
    users: mentionsOfParticipants(currentRoom.participants),
    amount: currentRoom.participants.size,
  })

  await ctx.editMessageText(textMessage, {
    parse_mode: 'HTML',
    reply_markup: INLINE_KEYBOARD_PARTICIPATE(ctx.botInfo.username)
      .reply_markup,
  })
}

// ------- [ scene ] ------- //

const registrationScene = new Scenes.BaseScene<BotContext>(SCENES.registration)

registrationScene.command(
  BOT_COMMANDS.start_game,
  checkStartGameAvailability,
  handleStartGame,
)
registrationScene.command(
  BOT_COMMANDS.start_game_now,
  checkStartGameNowAvailability,
  handleStartGameNow,
)
registrationScene.command(
  BOT_COMMANDS.stop_game,
  checkStopGameAvailability,
  handleStopGame,
)
registrationScene.command(BOT_COMMANDS.extend_game, handleExtendGame)

registrationScene.action(
  BOT_ACTIONS.participate,
  checkParticipationAvailability,
  handleParticipate,
)

export default registrationScene
