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

export type Elimination = {
  messageId: MessageId['message_id']
  eliminatedMemberId?: User['id']
}

export type GameRoom = {
  startDate: number
  registration: Registration | null
  status: GameStatus
  replyId?: MessageId['message_id']
  // question?: Question
  answers: Map<User['id'], string>
  numberOfSkips: number
  elimination?: Elimination
  participants: Map<User['id'], Participant>
}

export type CallbackEvent = () => Promise<void>

export type RemindEvent = {
  callback: CallbackEvent
  timeoutMs: number
}

export type RoomEvent = {
  reminder?: RemindEvent
  callback: CallbackEvent
  timeout: NodeJS.Timeout | null
  startDate: number
  dateExtended: boolean
  timeoutMs: number
}
