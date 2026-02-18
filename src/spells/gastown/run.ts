#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import runSingleAgent from '../../shared/gastown/runSingleAgent'
import { red } from '../../shared/colors'

const errorMessage = 'Error in gastown run'

type ParsedArgs = {
  readonly sandboxName?: string
  readonly workspace?: string
  readonly prompt?: string
  readonly promptFile?: string
  readonly detached: boolean
  readonly outputFile?: string
  readonly continueConversation: boolean
}

const generateSandboxName = (): string => `gastown-${Date.now()}`

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const defaults: ParsedArgs = {
    sandboxName: undefined,
    workspace: undefined,
    prompt: undefined,
    promptFile: undefined,
    detached: false,
    outputFile: undefined,
    continueConversation: false,
  }

  return argv.reduce((acc, arg, index, arr) => {
    const nextArg = arr[index + 1]

    if (arg === '-n' || arg === '--name')
      return nextArg ? { ...acc, sandboxName: nextArg } : acc
    if (arg === '-p' || arg === '--prompt')
      return nextArg ? { ...acc, prompt: nextArg } : acc
    if (arg === '-f' || arg === '--prompt-file')
      return nextArg ? { ...acc, promptFile: nextArg } : acc
    if (arg === '-d' || arg === '--detached')
      return { ...acc, detached: true }
    if (arg === '-o' || arg === '--output')
      return nextArg ? { ...acc, outputFile: nextArg } : acc
    if (arg === '-c' || arg === '--continue')
      return { ...acc, continueConversation: true }

    if (!arg.startsWith('-')) {
      const prevArg = arr[index - 1]
      const isPrevOption = prevArg && prevArg.match(/^-[nfpo]|^--(name|prompt-file|output)$/)

      if (!isPrevOption && !acc.workspace) {
        return { ...acc, workspace: arg }
      }
    }

    return acc
  }, defaults)
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (!options.workspace) {
    echo(red('Error: Workspace path required'))
    echo('')
    echo('Usage: gt-run [options] <workspace>')
    echo('')
    echo('Options:')
    echo('  -n, --name NAME      Sandbox name (default: gastown-<timestamp>)')
    echo('  -p, --prompt TEXT    Prompt to send to Claude (enables headless mode)')
    echo('  -f, --prompt-file    Read prompt from file')
    echo('  -d, --detached       Run in background (headless mode)')
    echo('  -o, --output FILE    Write output to file (headless mode)')
    echo('  -c, --continue       Continue previous conversation')
    process.exit(1)
  }

  await runSingleAgent({
    sandboxName: options.sandboxName || generateSandboxName(),
    workspace: options.workspace,
    prompt: options.prompt,
    promptFile: options.promptFile,
    detached: options.detached,
    outputFile: options.outputFile,
    continueConversation: options.continueConversation,
  })
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
