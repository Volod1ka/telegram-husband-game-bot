import type { User } from '@telegraf/types'

export type RequestHusbandStatus = 'awaiting' | 'denied'

export type Person = {
  role: 'unknown'
  request_husband: RequestHusbandStatus
}

export type Husband = {
  role: 'husband'
}

export type Member = {
  role: 'member'
  number: number
  eliminated: boolean
}

export type Participant = (Person | Husband | Member) & {
  user: User
  afk: boolean
}
