import { makeAutoObservable } from 'mobx'
import type { RootStore } from './RootStore'

export default class FeedbackStore {
  readonly rootStore: RootStore
  private _shownHasAdminRights: boolean
  private _settingsInitialized: boolean

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore
    this._shownHasAdminRights = true
    this._settingsInitialized = false
    makeAutoObservable(this)
  }

  get shownHasAdminRights() {
    return this._shownHasAdminRights
  }

  get settingsInitialized() {
    return this._settingsInitialized
  }

  private set shownHasAdminRights(state: boolean) {
    this.shownHasAdminRights = state
  }

  setShownHasAdminRights(state: boolean) {
    this.shownHasAdminRights = state
  }

  settingsInitializedComplete() {
    this._settingsInitialized = true
  }
}
