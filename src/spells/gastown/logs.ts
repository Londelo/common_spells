#!/usr/bin/env node
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { showLogs, listLogs, listOutputs } from '../../shared/gastown/logs'

const errorMessage = 'Error in gastown logs'

const parseArgs = (
  argv: readonly string[]
): {
  readonly follow: boolean
  readonly lines: number
  readonly showOutput: boolean
  readonly showAll: boolean
  readonly listOnly: boolean
  readonly pattern?: string
} => {
  const defaults = {
    follow: false,
    lines: 50,
    showOutput: false,
    showAll: false,
    listOnly: false,
    pattern: undefined as string | undefined,
  }

  return argv.reduce((acc, arg, index, arr) => {
    const nextArg = arr[index + 1]

    if (arg === '-f' || arg === '--follow') return { ...acc, follow: true }
    if (arg === '-n' || arg === '--lines')
      return nextArg ? { ...acc, lines: parseInt(nextArg, 10) } : acc
    if (arg === '-o' || arg === '--output') return { ...acc, showOutput: true }
    if (arg === '-a' || arg === '--all') return { ...acc, showAll: true }
    if (arg === '-l' || arg === '--list') return { ...acc, listOnly: true }

    if (!arg.startsWith('-') && index > 0 && !arr[index - 1].startsWith('-')) {
      return { ...acc, pattern: arg }
    }

    if (!arg.startsWith('-') && (index === 0 || !arr[index - 1].match(/^-(n|-lines)$/))) {
      return { ...acc, pattern: arg }
    }

    return acc
  }, defaults)
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.listOnly) {
    if (options.showOutput) {
      listOutputs()
    } else {
      listLogs()
    }
  } else {
    await showLogs({
      follow: options.follow,
      lines: options.lines,
      showOutput: options.showOutput,
      showAll: options.showAll,
      pattern: options.pattern,
    })
  }
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
