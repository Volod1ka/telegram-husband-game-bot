import Config from '@config'
import ms from 'ms'

const DEV = Config.ENV === 'development'

export const MAX_SHOWN_USER_NAME_LENGTH = 20 as const
export const EXTRA_MAX_SHOWN_USER_NAME_LENGTH = 2 as const

export const ELIMINATION_SKIPS_AMOUNT = 1 as const
export const MIN_PARTICIPANTS_AMOUNT = DEV ? 2 : 4
export const MAX_PARTICIPANTS_AMOUNT = 15 as const

export const MAX_ANSWER_LENGTH = 420 as const
export const MAX_QUESTION_LENGTH = 320 as const
export const MAX_HUSBAND_MESSAGE_LENGTH = 360 as const

export const REGISTRATION_TIMEOUT = ms(DEV ? '20s' : '1m')
export const MAX_REGISTRATION_TIMEOUT = ms('3m')
export const EXTEND_REGISTRATION_TIMEOUT = ms(DEV ? '30s' : '40s')
export const ACCEPT_HUSBAND_ROLE_TIMEOUT = ms(DEV ? '20s' : '40s')
export const QUESTION_TIMEOUT = ms(DEV ? '30s' : '15m')
export const ANSWERS_TIMEOUT = ms(DEV ? '50s' : '18m')
export const ELIMINATION_TIMEOUT = ms(DEV ? '20s' : '12m')

export const AUTO_CLEAR_MESSAGE_TIMEOUT = ms('7s')

export const REGISTRATION_REMIND_TIMEOUT = ms('10s')
