import { configure, makeAutoObservable } from 'mobx'
import FeedbackStore from './FeedbackStore'

export class RootStore {
  readonly feedbackStore: FeedbackStore

  constructor() {
    configure({ enforceActions: 'always' })

    this.feedbackStore = new FeedbackStore(this)
    makeAutoObservable(this)
  }
}

const store = new RootStore()

export default store
