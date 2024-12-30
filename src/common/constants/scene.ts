import type { ScenesName } from '@models/game'

export const SCENES: Record<ScenesName, ScenesName> = {
  registration: 'registration',
  search_husband: 'search_husband',
  question: 'question',
  answers: 'answers',
  elimination: 'elimination',
  finished: 'finished',
} as const
