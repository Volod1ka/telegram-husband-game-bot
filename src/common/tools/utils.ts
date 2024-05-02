import game from '@game/engine'
import type { Participant } from '@models/roles'
import type { User } from '@telegraf/types'
import type { BotContext } from 'bot/context'

export const createParticipant = (user: User): Participant => {
  return { role: 'unknown', afk: false, request_husband: 'awaiting', user }
}

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
