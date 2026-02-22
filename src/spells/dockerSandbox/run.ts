#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import runSingleAgent from '../../shared/dockerSandbox/runSingleAgent'
import { red } from '../../shared/colors'

const errorMessage = 'Error in dockerSandbox run'

type ParsedArgs = {
  readonly sandboxName?: string
  readonly workspace?: string
  readonly prompt?: string
  readonly promptFile?: string
}

const generateSandboxName = (): string => `ds-${Date.now()}`

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const defaults: ParsedArgs = {
    sandboxName: undefined,
    workspace: undefined,
    prompt: undefined,
    promptFile: undefined,
  }

  return argv.reduce((acc, arg, index, arr) => {
    const nextArg = arr[index + 1]

    if (arg === '-n' || arg === '--name')
      return nextArg ? { ...acc, sandboxName: nextArg } : acc
    if (arg === '-p' || arg === '--prompt')
      return nextArg ? { ...acc, prompt: nextArg } : acc
    if (arg === '-f' || arg === '--prompt-file')
      return nextArg ? { ...acc, promptFile: nextArg } : acc

    if (!arg.startsWith('-')) {
      const prevArg = arr[index - 1]
      const isPrevOption = prevArg && prevArg.match(/^-[nfp]|^--(name|prompt-file|prompt)$/)

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
    echo('Usage: ds-run [options] <workspace>')
    echo('')
    echo('Options:')
    echo('  -n, --name NAME      Sandbox name (default: ds-<timestamp>)')
    echo('  -p, --prompt TEXT    Prompt to send to Claude (headless mode)')
    echo('  -f, --prompt-file    Read prompt from file (headless mode)')
    process.exit(1)
  }

  await runSingleAgent({
    sandboxName: options.sandboxName || generateSandboxName(),
    workspace: options.workspace,
    prompt: options.prompt,
    promptFile: options.promptFile,
  })
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
