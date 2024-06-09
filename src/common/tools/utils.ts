import {
  BOT_COMMANDS,
  DEFAULT_ADMINISTRATOR_RIGHTS,
  DEFAULT_GAME_ROOM,
  EMPTY_ROOM_EVENT,
  REACTIONS,
} from '@constants'
import game from '@game/engine'
import type { GameRoom, RoomEvent } from '@models/game'
import type { Participant } from '@models/roles'
import type {
  ChatMemberAdministrator,
  TelegramEmoji,
  User,
} from '@telegraf/types'
import type { BotContext } from 'bot/context'

export type AdminRights = keyof typeof DEFAULT_ADMINISTRATOR_RIGHTS

export const getSessionKey = (ctx: BotContext) => {
  const fromId = ctx.from?.id
  const chatId = ctx.chat?.id

  if (!fromId || !chatId) return undefined

  if (ctx.chat.type === 'private') {
    const currentRoom = game.getRoomOfUser(chatId)

    return currentRoom ? `game-room:${currentRoom[0]}` : `${fromId}:${chatId}`
  }

  return `game-room:${chatId}`
}

export const getRandomEmoji = (): TelegramEmoji => {
  const index = Math.floor(Math.random() * REACTIONS.length)
  return REACTIONS[index]
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
