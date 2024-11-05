import chalk from 'chalk'
import { config, echo, exit } from 'shelljs'

const errorHandlerWrapper = async (func: () => void, errorMessage: string) => {
  config.fatal = true

  try {
    await func()
  } catch({ message }: any) {
    if(message.includes('User force closed the prompt')) {
      echo(chalk.yellow.italic('canceled'))
      exit(1)
    }
    echo(chalk.red.italic(errorMessage))
    exit(1)
  }
}

export default errorHandlerWrapper
