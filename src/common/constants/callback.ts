import type { AddParticipantToRoomStatus } from '@game/types'
import { t } from '@i18n'

export const PARTICIPATE_CALLBACK_ANSWERS: Record<
  AddParticipantToRoomStatus,
  string
> = {
  not_registration: t('answer_cb.participate.not_registration'),
  participant_added: t('answer_cb.participate.participant_added'),
  participant_in_game: t('answer_cb.participate.participant_in_game'),
  room_not_exist: t('answer_cb.participate.room_not_exist'),
} as const
