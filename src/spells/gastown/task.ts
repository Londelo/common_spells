#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { sendTask } from '../../shared/gastown/task'
import { red } from '../../shared/colors'

const errorMessage = 'Error in gastown task'

type ParsedArgs = {
  readonly sandbox?: string
  readonly prompt?: string
  readonly promptFile?: string
  readonly outputFile?: string
  readonly wait: boolean
  readonly fromStdin: boolean
}

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const defaults: ParsedArgs = {
    sandbox: undefined,
    prompt: undefined,
    promptFile: undefined,
    outputFile: undefined,
    wait: false,
    fromStdin: false,
  }

  return argv.reduce((acc, arg, index, arr) => {
    const nextArg = arr[index + 1]

    if (arg === '-f' || arg === '--file')
      return nextArg ? { ...acc, promptFile: nextArg } : acc
    if (arg === '-o' || arg === '--output')
      return nextArg ? { ...acc, outputFile: nextArg } : acc
    if (arg === '-w' || arg === '--wait') return { ...acc, wait: true }
    if (arg === '-') return { ...acc, fromStdin: true }

    if (!arg.startsWith('-')) {
      if (!acc.sandbox) {
        return { ...acc, sandbox: arg }
      } else if (!acc.prompt && !acc.promptFile && !acc.fromStdin) {
        return { ...acc, prompt: arg }
      }
    }

    return acc
  }, defaults)
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (!options.sandbox) {
    echo(red('Error: Sandbox name required'))
    echo('')
    echo('Usage: gt-task <sandbox> <prompt>')
    echo('       gt-task <sandbox> -f <file>')
    echo('       echo "prompt" | gt-task <sandbox> -')
    echo('')
    echo('Options:')
    echo('  -f, --file FILE    Read prompt from file')
    echo('  -o, --output FILE  Write output to file')
    echo('  -w, --wait         Wait for completion (default: background)')
    process.exit(1)
  }

  await sendTask({
    sandbox: options.sandbox,
    prompt: options.prompt || '',
    promptFile: options.promptFile,
    outputFile: options.outputFile,
    wait: options.wait,
  })
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
