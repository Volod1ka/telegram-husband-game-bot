import { DEFAULT_GAME_ROOM, EMPTY_ROOM_EVENT, REACTIONS } from '@constants'
import game from '@game/engine'
import type { GameRoom, RoomEvent } from '@models/game'
import type { Participant } from '@models/roles'
import type { TelegramEmoji, User } from '@telegraf/types'
import type { BotContext } from 'bot/context'

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

export const hasHusbandRole = ([, participant]: [User['id'], Participant]) =>
  participant.role === 'husband'

export const hasHusbandRoleNotAFK = ([, participant]: [
  User['id'],
  Participant,
]) => participant.role === 'husband' && !participant.afk

export const filteringMembersInGame = ([, participant]: [
  User['id'],
  Participant,
]) => participant.role === 'member' && !participant.eliminated
