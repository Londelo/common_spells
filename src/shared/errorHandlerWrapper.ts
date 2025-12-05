
import { echo, exit } from 'shelljs'
import { red, yellow } from './colors'

const errorHandlerWrapper = async (func: () => void, errorMessage: string) => {
  try {
    await func()
  } catch({ message,stack }: any) {
    if(message.includes('User force closed the prompt')) {
      echo(yellow('canceled'))
      exit(1)
    }
    echo(red(`${errorMessage}: ${message}`))
    echo(stack)
    exit(1)
  }
}

export default errorHandlerWrapper
