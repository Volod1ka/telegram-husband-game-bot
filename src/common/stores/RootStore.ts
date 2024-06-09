import { configure, makeAutoObservable } from 'mobx'
import FeedbackStore from './FeedbackStore'

export class RootStore {
  private _feedbackStore: FeedbackStore

  constructor() {
    configure({ enforceActions: 'always' })

    this._feedbackStore = new FeedbackStore(this)
    makeAutoObservable(this)
  }

  get feedbackStore() {
    return this._feedbackStore
  }
}

const store = new RootStore()

export default store
