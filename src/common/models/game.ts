import type { MessageId, User } from '@telegraf/types'
import type { Participant } from './roles'

export type ScenesName = GameStatus

export type GameStatus =
  | 'registration'
  | 'search_husband'
  | 'question'
  | 'answers'
  | 'elimination'
  | 'finished'

export type Registration = {
  // Pick<MessageId, 'message_id'> & {
  creatorId: User['id']
}

export type Question = Pick<MessageId, 'message_id'> & {
  text: string
}

export type GameRoom = {
  startDate: number
  registration: Registration | null
  status: GameStatus
  replyId?: MessageId['message_id']
  // question?: string
  answers: Map<User['id'], string>
  numberOfSkips: number
  eliminatedParticipantId?: User['id'] // | null
  participants: Map<User['id'], Participant>
}

export type RoomEvent = {
  timeout: NodeJS.Timeout | null
  startDate: number
  dateExtended: boolean
  timeoutMs: number
}
