import answersScene from './answers'
import eliminationScene from './elimination'
import finishedScene from './finished'
import husbandSearchScene from './husbandSearch'
import questionScene from './question'
import registrationScene from './registration'

const allScenes = [
  registrationScene,
  husbandSearchScene,
  questionScene,
  answersScene,
  eliminationScene,
  finishedScene,
] as const

export { allScenes }
