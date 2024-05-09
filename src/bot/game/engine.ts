import {
  DEFAULT_GAME_ROOM,
  EMPTY_ROOM_EVENT,
  MAX_REGISTRATION_TIMEOUT,
  MIN_PARTICIPANTS_COUNT,
} from '@constants'
import type { GameRoom, Question, RoomEvent } from '@models/game'
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
    chatId: Chat['id'],
    callback: () => Promise<void>,
    ms: number,
  ) {
    const event = this.events.get(chatId)

    if (!event || !event.date_extended) {
      return
    }

    event.date_extended = false
    event.start_date = Date.now()
    event.timeout_ms = ms
    event.timeout = setTimeout(() => {
      callback()
      this.unregisterTimeoutEvent(chatId)
    }, ms)
    event.timeout.ref()
  }

  unregisterTimeoutEvent(chatId: Chat['id']) {
    const event = this.events.get(chatId)

    if (!event?.timeout) {
      return
    }

    event.date_extended = true
    event.start_date = 0
    event.timeout_ms = 0
    clearTimeout(event.timeout)
  }

  async extendRegistrationTimeout(
    chatId: Chat['id'],
    callback: () => Promise<void>,
    extendMs: number,
  ) {
    const event = this.events.get(chatId)

    if (!event) {
      return 0
    }

    const difference = Date.now() - event.start_date
    event.timeout_ms += extendMs
    const remainsTime = Math.min(
      event.timeout_ms - difference,
      MAX_REGISTRATION_TIMEOUT,
    )

    if (!event.date_extended && difference < event.timeout_ms) {
      if (event.timeout) {
        clearTimeout(event.timeout)
      }

      event.timeout = setInterval(async () => {
        await callback()
        await this.unregisterTimeoutEvent(chatId)
      }, remainsTime)
      event.timeout.ref()

      return remainsTime
    }

    return 0
  }

  getRoomStatus(chatId: Chat['id']) {
    return this.rooms.get(chatId)?.status ?? null
  }

  getRoomOfUser(userId: User['id']) {
    if (!this.rooms.size) return null

    return (
      [...this.rooms.entries()].find(([, room]) =>
        room.participants.has(userId),
      ) ?? null
    )
  }

  createRoom(chatId: Chat['id']): boolean {
    if (this.rooms.has(chatId)) {
      return false
    }

    this.events.set(chatId, EMPTY_ROOM_EVENT)
    return !!this.rooms.set(chatId, DEFAULT_GAME_ROOM)
  }

  setMessageForRegistration(
    chatId: Chat['id'],
    { id: creatorId }: User,
    messageId: MessageId['message_id'],
  ) {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) {
      return false
    }

    const updatedRoom = {
      ...currentRoom,
      registration: { creator_id: creatorId, message_id: messageId },
    } satisfies GameRoom

    return !!this.rooms.set(chatId, updatedRoom)
  }

  // ? TODO: close only in status registration or finished?
  closeRoom(chatId: Chat['id'], force?: boolean): boolean {
    const roomStatus = this.getRoomStatus(chatId)

    const deleteEnabled =
      force || roomStatus === 'registration' || roomStatus === 'finished'

    if (deleteEnabled) {
      this.unregisterTimeoutEvent(chatId)
      this.rooms.delete(chatId)
      this.events.delete(chatId)
    }

    return deleteEnabled
  }

  addParticipantToRoom(
    chatId: Chat['id'],
    user: User,
  ): AddParticipantToRoomStatus {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) {
      return 'room_not_exist'
    }

    if (this.getRoomOfUser(user.id)) {
      return 'participant_in_game'
    }

    if (currentRoom.status !== 'registration') {
      return 'not_registration'
    }

    const updatedRoom = {
      ...currentRoom,
      participants: new Map(currentRoom.participants).set(
        user.id,
        createParticipant(user),
      ),
    } satisfies GameRoom

    this.rooms.set(chatId, updatedRoom)

    return 'participant_added'
  }

  completeRegistration(chatId: Chat['id']): FinishRegistrationStatus {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) {
      return 'room_not_exist'
    }

    if (currentRoom?.status !== 'registration') {
      return 'not_registration'
    }

    if (currentRoom.participants.size >= MIN_PARTICIPANTS_COUNT) {
      this.rooms.set(chatId, { ...currentRoom, status: 'search_husband' })
      return 'next_status'
    }

    this.closeRoom(chatId)
    return 'not_enough_participants'
  }

  getRandomRequestHusbandRole(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)!
    const participants = [...currentRoom.participants.entries()]
    const filteredParticipants = participants.filter(
      ([, participant]) =>
        participant.role === 'unknown' &&
        participant.request_husband !== 'denied',
    )

    const length = filteredParticipants.length || participants.length
    const index = Math.floor(Math.random() * length)

    return filteredParticipants.length
      ? filteredParticipants[index]
      : participants[index]
  }

  acceptHusbandRole(
    chatId: Chat['id'],
    user: User,
    accepted: boolean,
  ): AcceptHusbandRoleStatus {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom || currentRoom.status !== 'search_husband') {
      return 'cancel'
    }

    const updatedParticipant = (
      accepted
        ? { role: 'husband', afk: false, user }
        : { role: 'unknown', afk: false, request_husband: 'denied', user }
    ) satisfies Participant

    currentRoom.participants.set(user.id, updatedParticipant)

    return accepted ? 'accept' : 'deny'
  }

  allСanceledHusbandRole(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)!
    const participant = [...currentRoom.participants.entries()].find(
      ([, participant]) =>
        participant.role === 'unknown' &&
        participant.request_husband !== 'denied',
    )

    return !participant
  }

  assignRandomNumberToMembers(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)
    const husband = this.getHusbandInRoom(chatId)

    if (!currentRoom || !husband) {
      return
    }

    currentRoom.participants.delete(husband[0])

    const usedNumbers = new Set<number>()

    currentRoom.participants.forEach((participant, key, participants) => {
      let randomNumber: number
      do {
        randomNumber = Math.floor(Math.random() * participants.size) + 1
      } while (usedNumbers.has(randomNumber))

      usedNumbers.add(randomNumber)

      participants.set(key, {
        role: 'member',
        afk: participant.afk,
        eliminated: false,
        number: randomNumber,
        user: participant.user,
      })
    })

    currentRoom.participants.set(husband[0], husband[1])
  }

  completeHusbandSearch(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)

    if (currentRoom?.status !== 'search_husband') return

    this.rooms.set(chatId, { ...currentRoom, status: 'question' })
  }

  getHusbandInRoom(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)

    return currentRoom
      ? [...currentRoom.participants.entries()].find(
          ([, participant]) => participant.role === 'husband',
        ) || null
      : null
  }

  isHusbandRole(userId: User['id']) {
    const currentRoom = this.getRoomOfUser(userId)

    if (!currentRoom) return false

    const participant = currentRoom[1].participants.get(userId)

    return !!participant && participant.role === 'husband'
  }

  setQuestionByHasband(userId: User['id'], question: Question) {
    const currentRoom = this.getRoomOfUser(userId)

    if (!currentRoom || currentRoom[1].status !== 'question') return

    this.rooms.set(currentRoom[0], { ...currentRoom[1], question })
  }
}

const game = new GameEngine()

export default game
