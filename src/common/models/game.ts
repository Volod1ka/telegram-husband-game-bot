import type { MessageId, User } from '@telegraf/types'
import type { Participant } from './roles'

export type ScenesName = 'registration' | 'husband_search' | 'question'

export type GameStatus =
  | 'registration'
  | 'search_husband'
  | 'question'
  | 'answers'
  | 'elimination'
  | 'finished'

export type Registration = {
  creator_id: User['id']
  message_id: MessageId['message_id']
}

export type GameRoom = {
  registration: Registration | null
  status: GameStatus
  question: string | null
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
