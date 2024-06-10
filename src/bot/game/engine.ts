import { MAX_REGISTRATION_TIMEOUT, MIN_PARTICIPANTS_COUNT } from '@constants'
import type { GameRoom, GameStatus, RoomEvent } from '@models/game'
import type { Participant } from '@models/roles'
import type { Chat, MessageId, User } from '@telegraf/types'
import {
  createNewGameRoom,
  createNewRoomEvent,
  createParticipant,
  filteringMembersInGame,
  hasHusbandRoleNotAFK,
  hasUnknownRole,
  sortingMembersByNumber,
} from '@tools/utils'
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

    if (!event || !event.dateExtended) return

    event.dateExtended = false
    event.startDate = Date.now()
    event.timeoutMs = ms
    event.timeout = setTimeout(async () => {
      this.unregisterTimeoutEvent(chatId)
      await callback()
    }, ms)
    event.timeout.ref()
  }

  unregisterTimeoutEvent(chatId: Chat['id']) {
    const event = this.events.get(chatId)

    if (!event?.timeout) return

    event.dateExtended = true
    event.startDate = 0
    event.timeoutMs = 0
    clearTimeout(event.timeout)
    event.timeout = null
  }

  extendRegistrationTimeout(
    chatId: Chat['id'],
    callback: () => Promise<void>,
    extendMs: number,
  ): number {
    const event = this.events.get(chatId)

    if (!event) return 0

    const difference = Date.now() - event.startDate
    event.timeoutMs += extendMs
    const remainsTime = Math.min(
      event.timeoutMs - difference,
      MAX_REGISTRATION_TIMEOUT,
    )

    if (event.dateExtended || difference >= event.timeoutMs) return 0

    if (event.timeout) clearTimeout(event.timeout)

    event.timeout = setInterval(async () => {
      this.unregisterTimeoutEvent(chatId)
      await callback()
    }, remainsTime)
    event.timeout.ref()

    return remainsTime
  }

  getRoomStatus(chatId: Chat['id']): GameStatus | null {
    return this.rooms.get(chatId)?.status ?? null
  }

  getRoomOfUser(userId: User['id']) {
    if (!this.rooms.size) return null

    const rooms = [...this.rooms.entries()]

    return rooms.find(([, room]) => room.participants.has(userId)) ?? null
  }

  createRoom(chatId: Chat['id']): boolean {
    if (this.rooms.has(chatId)) return false

    this.events.set(chatId, createNewRoomEvent())
    this.rooms.set(chatId, createNewGameRoom())

    return true
  }

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

  setMessageForRegistration(
    chatId: Chat['id'],
    { id: creatorId }: User,
    messageId: MessageId['message_id'],
  ): boolean {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) return false

    const updatedRoom = {
      ...currentRoom,
      replyId: messageId,
      registration: { creatorId },
    } satisfies GameRoom

    return !!this.rooms.set(chatId, updatedRoom)
  }

  addParticipantToRoom(
    chatId: Chat['id'],
    user: User,
  ): AddParticipantToRoomStatus {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) return 'room_not_exist'

    if (this.getRoomOfUser(user.id)) return 'participant_in_game'

    if (currentRoom.status !== 'registration') return 'not_registration'

    currentRoom.participants.set(user.id, createParticipant(user))

    return 'participant_added'
  }

  removeParticipantFromRoom(chatId: Chat['id'], { id: userId }: User) {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) return

    currentRoom.participants.delete(userId)
  }

  completeRegistration(chatId: Chat['id']): FinishRegistrationStatus {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) return 'room_not_exist'

    if (currentRoom?.status !== 'registration') return 'not_registration'

    if (currentRoom.participants.size >= MIN_PARTICIPANTS_COUNT) {
      this.rooms.set(chatId, { ...currentRoom, status: 'search_husband' })
      return 'next_status'
    }

    this.closeRoom(chatId, true)
    return 'not_enough_participants'
  }

  getRandomRequestHusbandRole(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)!
    const participants = [...currentRoom.participants.entries()]
    const filteredParticipants = participants.filter(hasUnknownRole)

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

    if (!currentRoom || currentRoom.status !== 'search_husband') return 'cancel'

    const updatedParticipant = (
      accepted
        ? { role: 'husband', afk: false, user }
        : { role: 'unknown', afk: false, request_husband: 'denied', user }
    ) satisfies Participant

    currentRoom.participants.set(user.id, updatedParticipant)

    return accepted ? 'accept' : 'deny'
  }

  allСanceledHusbandRole(chatId: Chat['id']): boolean {
    const currentRoom = this.rooms.get(chatId)!
    const participants = [...currentRoom.participants.entries()]

    return !participants.find(hasUnknownRole)
  }

  assignRandomNumberToMembers(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)
    const husband = this.getHusbandInGame(chatId)

    if (!currentRoom || !husband) return

    currentRoom.participants.delete(husband[0])

    const usedNumbers = new Set<number>()

    for (const [key, participant] of currentRoom.participants) {
      let randomNumber: number
      do {
        randomNumber =
          Math.floor(Math.random() * currentRoom.participants.size) + 1
      } while (usedNumbers.has(randomNumber))

      usedNumbers.add(randomNumber)
      currentRoom.participants.set(key, {
        role: 'member',
        afk: participant.afk,
        eliminated: false,
        number: randomNumber,
        user: participant.user,
      })
    }

    currentRoom.participants.set(husband[0], husband[1])
  }

  sortMembersByNumber(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) return

    const participants = [...currentRoom.participants.entries()]
    const sortedMembers = participants.sort(sortingMembersByNumber)

    currentRoom.participants = new Map(sortedMembers)
  }

  completeHusbandSearch(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)

    if (currentRoom?.status !== 'search_husband') return

    this.rooms.set(chatId, { ...currentRoom, status: 'question' })
  }

  private isParticipantRole(
    userId: User['id'],
    role: Participant['role'],
  ): boolean {
    const currentRoom = this.getRoomOfUser(userId)

    if (!currentRoom) return false

    const participant = currentRoom[1].participants.get(userId)

    return !!participant && participant.role === role
  }

  isHusbandRole(userId: User['id']): boolean {
    return this.isParticipantRole(userId, 'husband')
  }

  isMemberRole(userId: User['id']): boolean {
    return this.isParticipantRole(userId, 'member')
  }

  setQuestionByHasband(
    userId: User['id'],
    message_id: MessageId['message_id'],
  ) {
    const currentRoom = this.getRoomOfUser(userId)

    if (!currentRoom || currentRoom[1].status !== 'question') return

    this.rooms.set(currentRoom[0], { ...currentRoom[1], replyId: message_id })
  }

  completeHusbandQuestion(chatId: Chat['id'], finished: boolean = false) {
    const currentRoom = this.rooms.get(chatId)

    if (currentRoom?.status !== 'question') return

    this.rooms.set(chatId, {
      ...currentRoom,
      status: finished ? 'finished' : 'answers',
    })
  }

  completeMemberAnswers(
    chatId: Chat['id'],
    messageId: MessageId['message_id'],
  ) {
    const currentRoom = this.rooms.get(chatId)

    if (currentRoom?.status !== 'answers') return

    for (const [participantId, participant] of currentRoom.participants) {
      if (participant.role !== 'member') continue

      if (participant.afk && !participant.eliminated) {
        currentRoom.participants.set(participantId, {
          ...participant,
          eliminated: true,
        })
      }
    }

    currentRoom.answers.clear()
    this.rooms.set(chatId, {
      ...currentRoom,
      status: 'elimination',
      replyId: messageId,
    })
  }

  setAnswerByMember(userId: User['id'], answer: string): boolean {
    const currentRoom = this.getRoomOfUser(userId)

    if (
      !currentRoom ||
      currentRoom[1].status !== 'answers' ||
      !this.isMemberRole(userId)
    ) {
      return false
    }

    const [, room] = currentRoom
    return !!room.answers.set(userId, answer)
  }

  getMembersInGame(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) return []

    const participants = [...currentRoom.participants.entries()]

    return participants.filter(filteringMembersInGame)
  }

  getHusbandInGame(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom) return null

    const participants = [...currentRoom.participants.entries()]

    return participants.find(hasHusbandRoleNotAFK) ?? null
  }

  setAFKMembersInAnswers(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom || currentRoom.status !== 'answers') return

    const membersInGame = this.getMembersInGame(chatId)

    for (const [memberId, member] of membersInGame) {
      const answer = currentRoom.answers.get(memberId)

      if (!answer?.length) {
        currentRoom.participants.set(memberId, {
          ...member,
          afk: true,
        })
      }
    }
  }

  everyoneAnswered(chatId: Chat['id']): boolean {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom || currentRoom.status !== 'answers') return false

    const membersInGame = this.getMembersInGame(chatId)

    return currentRoom.answers.size === membersInGame.length
  }

  skipElimination(chatId: Chat['id']) {
    const currentRoom = this.rooms.get(chatId)

    if (
      !currentRoom ||
      currentRoom.status !== 'elimination' ||
      currentRoom.numberOfSkips <= 0
    )
      return

    this.rooms.set(chatId, {
      ...currentRoom,
      numberOfSkips: currentRoom.numberOfSkips - 1,
    })
  }

  eliminateMember(chatId: Chat['id'], memberId: User['id']) {
    const currentRoom = this.rooms.get(chatId)

    if (!currentRoom || currentRoom.status !== 'elimination') return

    const participant = currentRoom.participants.get(memberId)

    if (!participant || participant.role !== 'member') return

    currentRoom.participants.set(memberId, {
      ...participant,
      eliminated: true,
    })
    this.rooms.set(chatId, {
      ...currentRoom,
      eliminatedParticipantId: memberId,
    })
  }

  completeElimination(chatId: Chat['id'], finished: boolean) {
    const currentRoom = this.rooms.get(chatId)

    if (currentRoom?.status !== 'elimination') return

    this.rooms.set(chatId, {
      ...currentRoom,
      status: finished ? 'finished' : 'question',
      eliminatedParticipantId: undefined,
      replyId: undefined,
    })
  }
}

const game = new GameEngine()

export default game
