export type RoomNotExistStatus = 'room_not_exist'
export type NotRegistrationStatus = 'not_registration'

export type AddParticipantToRoomStatus =
  | RoomNotExistStatus
  | NotRegistrationStatus
  | 'participant_added'
  | 'participant_in_game'

export type FinishRegistrationStatus =
  | RoomNotExistStatus
  | NotRegistrationStatus
  | 'next_status'
  | 'not_enough_participants'

export type AcceptHusbandRoleStatus = 'accept' | 'deny' | 'cancel'
