import answersScene from './answers'
import eliminationScene from './elimination'
import husbandSearchScene from './husbandSearch'
import questionScene from './question'
import registrationScene from './registration'

const allScenes = [
  registrationScene,
  husbandSearchScene,
  questionScene,
  answersScene,
  eliminationScene,
] as const

export { allScenes }
