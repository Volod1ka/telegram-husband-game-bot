import {
  DEFAULT_GAME_ROOM,
  EMPTY_ROOM_EVENT,
  MAX_REGISTRATION_TIMEOUT,
  MIN_PARTICIPANTS_COUNT,
} from '@constants'
import type { GameRoom, RoomEvent } from '@models/game'
import type { Participant } from '@models/roles'
import type { Chat, MessageId, User } from '@telegraf/types'
import { createParticipant } from '@tools/utils'
import type {
  AcceptHusbandRoleStatus,
  AddParticipantToRoomStatus,
  FinishRegistrationStatus,
} from './types'

export class GameEngine {
  rooms: Map<Chat['id'], GameRoom>
  private events: Map<Chat['id'], RoomEvent>

  constructor() {
    this.rooms = new Map()
    this.events = new Map()
  }

  registerTimeoutEvent(
    chat_id: Chat['id'],
    callback: () => Promise<void>,
    ms: number,
  ) {
    const event = this.events.get(chat_id)

    if (!event || !event.date_extended) {
      return
    }

    event.date_extended = false
    event.start_date = Date.now()
    event.timeout_ms = ms
    event.timeout = setTimeout(() => {
      callback()
      this.unregisterTimeoutEvent(chat_id)
    }, ms)
    event.timeout.ref()
  }

  unregisterTimeoutEvent(chat_id: Chat['id']) {
    const event = this.events.get(chat_id)

    if (!event?.timeout) {
      return
    }

    event.date_extended = true
    event.start_date = 0
    event.timeout_ms = 0
    clearTimeout(event.timeout)
  }

  async extendRegistrationTimeout(
    chat_id: Chat['id'],
    callback: () => Promise<void>,
    extend_ms: number,
  ) {
    const event = this.events.get(chat_id)

    if (!event) {
      return 0
    }

    const difference = Date.now() - event.start_date
    event.timeout_ms += extend_ms
    const remains_time = Math.min(
      event.timeout_ms - difference,
      MAX_REGISTRATION_TIMEOUT,
    )

    if (!event.date_extended && difference < event.timeout_ms) {
      if (event.timeout) {
        clearTimeout(event.timeout)
      }

      event.timeout = setInterval(async () => {
        await callback()
        await this.unregisterTimeoutEvent(chat_id)
      }, remains_time)
      event.timeout.ref()

      return remains_time
    }

    return 0
  }

  getRoomStatus(chat_id: Chat['id']) {
    return this.rooms.get(chat_id)?.status ?? null
  }

  getRoomOfUser(id: User['id']) {
    if (!this.rooms.size) {
      return null
    }

    return (
      Array.from(this.rooms.entries()).find(([, room]) =>
        room.participants.has(id),
      ) ?? null
    )
  }

  createRoom(chat_id: Chat['id']): boolean {
    if (this.rooms.has(chat_id)) {
      return false
    }

    this.events.set(chat_id, EMPTY_ROOM_EVENT)
    return !!this.rooms.set(chat_id, DEFAULT_GAME_ROOM)
  }

  setMessageForRegistration(
    chat_id: Chat['id'],
    { id: creator_id }: User,
    message_id: MessageId['message_id'],
  ) {
    const room = this.rooms.get(chat_id)

    if (!room) {
      return false
    }

    const updatedRoom = {
      ...room,
      registration: { creator_id, message_id },
    } satisfies GameRoom

    return !!this.rooms.set(chat_id, updatedRoom)
  }

  // ? TODO: close only in status registration or finished?
  closeRoom(chat_id: Chat['id'], force?: boolean): boolean {
    const room_status = this.getRoomStatus(chat_id)

    const delete_enabled =
      force || room_status === 'registration' || room_status === 'finished'

    if (delete_enabled) {
      this.unregisterTimeoutEvent(chat_id)
      this.rooms.delete(chat_id)
      this.events.delete(chat_id)
    }

    return delete_enabled
  }

  addParticipantToRoom(
    chat_id: Chat['id'],
    user: User,
  ): AddParticipantToRoomStatus {
    const room = this.rooms.get(chat_id)

    if (!room) {
      return 'room_not_exist'
    }

    if (this.getRoomOfUser(user.id)) {
      return 'participant_in_game'
    }

    if (room.status !== 'registration') {
      return 'not_registration'
    }

    const updatedRoom = {
      ...room,
      participants: new Map(room.participants).set(
        user.id,
        createParticipant(user),
      ),
    } satisfies GameRoom

    this.rooms.set(chat_id, updatedRoom)

    return 'participant_added'
  }

  completeRegistration(chat_id: Chat['id']): FinishRegistrationStatus {
    const room = this.rooms.get(chat_id)

    if (!room) {
      return 'room_not_exist'
    }

    if (room?.status !== 'registration') {
      return 'not_registration'
    }

    if (room.participants.size >= MIN_PARTICIPANTS_COUNT) {
      this.rooms.set(chat_id, { ...room, status: 'search_husband' })
      return 'next_status'
    }

    this.closeRoom(chat_id)
    return 'not_enough_participants'
  }

  getRandomRequestHusbandRole(chat_id: Chat['id']) {
    const room = this.rooms.get(chat_id)!
    const participants = Array.from(room.participants.entries())
    const filtered_participants = participants.filter(
      ([, participant]) =>
        participant.role === 'unknown' &&
        participant.request_husband !== 'denied',
    )

    const length = filtered_participants.length || participants.length

    const index = Math.floor(Math.random() * length)

    return filtered_participants.length
      ? filtered_participants[index]
      : participants[index]
  }

  acceptHusbandRole(
    chat_id: Chat['id'],
    user: User,
    accepted: boolean,
  ): AcceptHusbandRoleStatus {
    const room = this.rooms.get(chat_id)

    if (!room || room.status !== 'search_husband') {
      return 'cancel'
    }

    const updated_participant = (
      accepted
        ? { role: 'husband', afk: false, user }
        : { role: 'unknown', afk: false, request_husband: 'denied', user }
    ) satisfies Participant

    room.participants.set(user.id, updated_participant)

    return accepted ? 'accept' : 'deny'
  }

  allСanceledHusbandRole(chat_id: Chat['id']) {
    const room = this.rooms.get(chat_id)!
    const participant = Array.from(room.participants.entries()).find(
      ([, participant]) =>
        participant.role === 'unknown' &&
        participant.request_husband !== 'denied',
    )

    return !participant
  }

  assignRandomNumberToMembers(chat_id: Chat['id']) {
    const room = this.rooms.get(chat_id)
    const husband = Array.from(room?.participants?.entries() ?? []).find(
      ([, member]) => member.role === 'husband',
    )

    if (!room || !husband) {
      return
    }

    room.participants.delete(husband[0])

    const used_numbers = new Set<number>()

    room.participants.forEach((participant, key, participants) => {
      let random_number: number
      do {
        random_number = Math.floor(Math.random() * participants.size) + 1
      } while (used_numbers.has(random_number))

      used_numbers.add(random_number)

      participants.set(key, {
        role: 'member',
        afk: participant.afk,
        eliminated: false,
        number: random_number,
        user: participant.user,
      })
    })

    room.participants.set(husband[0], husband[1])
  }

  completeHusbandSearch(chat_id: Chat['id']) {
    const room = this.rooms.get(chat_id)

    if (room?.status !== 'search_husband') {
      return
    }

    this.rooms.set(chat_id, { ...room, status: 'question' })
  }
}

const game = new GameEngine()

export default game
