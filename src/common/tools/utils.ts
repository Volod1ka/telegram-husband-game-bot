import {
  DEFAULT_ADMINISTRATOR_RIGHTS,
  DEFAULT_GAME_ROOM,
  EMPTY_ROOM_EVENT,
  REACTIONS,
  TELEGRAM_MESSAGE_LINK,
} from '@constants/common'
import { BOT_COMMANDS } from '@constants/interactive'
import game from '@game/engine'
import type { GameRoom, RoomEvent } from '@models/game'
import type { Participant } from '@models/roles'
import type {
  Chat,
  ChatMemberAdministrator,
  MessageId,
  TelegramEmoji,
  User,
} from '@telegraf/types'
import type { BotContext } from 'bot/context'
import { format, toDate } from 'date-fns'
import { getRandomToValue } from './math'

export type AdminRights = keyof typeof DEFAULT_ADMINISTRATOR_RIGHTS

export const getSessionKey = (ctx: BotContext) => {
  const fromId = ctx.from?.id
  const chatId = ctx.chat?.id

  if (!fromId || !chatId) {
    return undefined
  }

  if (ctx.chat.type === 'private') {
    const currentRoom = game.getRoomOfUser(chatId)

    return currentRoom ? `game-room:${currentRoom[0]}` : `${fromId}:${chatId}`
  }

  return `game-room:${chatId}`
}

export const getRandomEmoji = (): TelegramEmoji => {
  const index = getRandomToValue(REACTIONS.length)
  return REACTIONS.at(index) ?? '🦄'
}

export const getRandomText = (texts: string[]) => {
  const index = getRandomToValue(texts.length)
  return texts.at(index)
}

export const createParticipant = (user: User): Participant => {
  return { role: 'unknown', afk: false, request_husband: 'awaiting', user }
}

export const createNewGameRoom = (): GameRoom => ({
  ...DEFAULT_GAME_ROOM,
  answers: new Map(DEFAULT_GAME_ROOM.answers),
  participants: new Map(DEFAULT_GAME_ROOM.participants),
})

export const createNewRoomEvent = (): RoomEvent => ({
  ...EMPTY_ROOM_EVENT,
})

export const hasUnknownRole = ([, participant]: [User['id'], Participant]) =>
  participant.role === 'unknown' && participant.request_husband !== 'denied'

export const sortingMembersByNumber = (
  [, prev]: [User['id'], Participant],
  [, next]: [User['id'], Participant],
) => {
  if (prev.role === 'member' && next.role === 'member') {
    return prev.number - next.number
  }

  return prev.role === 'member' ? -1 : 1
}

export const hasHusbandRoleNotAFK = ([, participant]: [
  User['id'],
  Participant,
]) => participant.role === 'husband' && !participant.afk

export const filteringMembersInGame = ([, participant]: [
  User['id'],
  Participant,
]) => participant.role === 'member' && !participant.eliminated

export const hasAllPermissions = (
  botInfo: ChatMemberAdministrator,
): boolean => {
  return Object.entries(DEFAULT_ADMINISTRATOR_RIGHTS).every(
    ([key, value]) => !value || botInfo[key as AdminRights],
  )
}

export const hasCommand = (text: string): boolean => {
  return !!Object.values(BOT_COMMANDS).find(command =>
    text.includes(`/${command}`),
  )
}

export const createMessageLink = (
  chatId: Chat['id'],
  messageId: MessageId['message_id'],
): string =>
  `${TELEGRAM_MESSAGE_LINK}${chatId.toString().slice(4)}/${messageId}`

export const handleCatch = (
  error: unknown,
  ctx: BotContext,
  solution?: () => unknown,
) => {
  logHandleError(error, ctx)

  return solution?.() ?? null
}

export const logHandleError = (error: unknown, ctx: BotContext) => {
  const date = format(toDate(Date.now()), '[dd/MM/yyyy – kk:mm:ss]')
  const chat = JSON.stringify(ctx.chat)
  const from = JSON.stringify(ctx.from)
  const details =
    error instanceof TypeError
      ? error
      : JSON.stringify(error, null, 2).replaceAll('\n', '\n| ')

  console.groupCollapsed(`\n${date} ≈> ⛔ error:`)
  console.error(`| chat: ${chat}\n| from: ${from}\n|\n| details: ${details}\n`)
  console.groupEnd()
}

export const logHandleInfo = (message: string, ctx: BotContext) => {
  const date = format(toDate(Date.now()), '[dd/MM/yyyy – kk:mm:ss]')
  const chat = JSON.stringify(ctx.chat)
  const from = JSON.stringify(ctx.from)

  console.groupCollapsed(`\n${date} ≈> ℹ️ info:`)
  console.info(`| chat: ${chat}\n| from: ${from}\n|\n| details: ${message}\n`)
  console.groupEnd()
}
