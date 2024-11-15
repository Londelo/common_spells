import colors from 'colors'

const green = (text:string) => colors.green.italic(text)
const yellow = (text:string) => colors.yellow.italic(text)
const red = (text:string) => colors.red.italic(text)
const rainbow = (text:string) => colors.rainbow(text)

export {
  green,
  yellow,
  red,
  rainbow
}
