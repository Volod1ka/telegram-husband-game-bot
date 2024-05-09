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

export type Registration = Pick<MessageId, 'message_id'> & {
  creator_id: User['id']
}

export type Question = Pick<MessageId, 'message_id'> & {
  text: string
}

export type GameRoom = {
  registration: Registration | null
  status: GameStatus
  question: Question | null
  answers: Map<User['id'], string>
  number_of_skips: number
  eliminated_participant: User['id'] | null
  participants: Map<User['id'], Participant>
}

export type RoomEvent = {
  timeout: NodeJS.Timeout | null
  start_date: number
  date_extended: boolean
  timeout_ms: number
}
