import { makeAutoObservable } from 'mobx'
import type { RootStore } from './RootStore'

export default class FeedbackStore {
  private _rootStore: RootStore
  private _shownHasAdminRights: boolean
  private _settingsInitialized: boolean

  constructor(rootStore: RootStore) {
    this._rootStore = rootStore
    this._shownHasAdminRights = true
    this._settingsInitialized = false
    makeAutoObservable(this)
  }

  get rootStore() {
    return this._rootStore
  }

  get shownHasAdminRights() {
    return this._shownHasAdminRights
  }

  get settingsInitialized() {
    return this._settingsInitialized
  }

  setShownHasAdminRights(state: boolean) {
    this._shownHasAdminRights = state
  }

  settingsInitializedComplete() {
    this._settingsInitialized = true
  }
}
