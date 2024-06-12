export const getRandomRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const getRandomToValue = (value: number) =>
  Math.floor(Math.random() * value)
