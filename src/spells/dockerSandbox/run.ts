#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import runSingleAgent from '../../shared/dockerSandbox/runSingleAgent'
import { red } from '../../shared/colors'

const errorMessage = 'Error in dockerSandbox run'

type ParsedArgs = {
  readonly sandboxName?: string
  readonly workspaces: readonly string[]
  readonly prompt?: string
  readonly promptFile?: string
}

const generateSandboxName = (): string => `ds-${Date.now()}`

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const defaults: ParsedArgs = {
    sandboxName: undefined,
    workspaces: [],
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

      if (!isPrevOption) {
        // Collect all non-option arguments as workspaces
        return { ...acc, workspaces: [...acc.workspaces, arg] }
      }
    }

    return acc
  }, defaults)
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.workspaces.length === 0) {
    echo(red('Error: At least one workspace path required'))
    echo('')
    echo('Usage: ds-run [options] <workspace1> [workspace2:ro] [workspace3] ...')
    echo('')
    echo('Options:')
    echo('  -n, --name NAME        Sandbox name (default: ds-<timestamp>)')
    echo('  -p, --prompt TEXT      Prompt to send to Claude (headless mode)')
    echo('  -f, --prompt-file      Read prompt from file (headless mode)')
    echo('')
    echo('Examples:')
    echo('  ds-run /path/to/workspace')
    echo('  ds-run /path/to/workspace /path/to/readonly:ro')
    echo('  ds-run ./project1 ./project2:ro ./project3')
    process.exit(1)
  }

  // Convert array of workspaces to comma-separated string
  const workspacesStr = options.workspaces.join(',')

  await runSingleAgent({
    sandboxName: options.sandboxName || generateSandboxName(),
    workspaces: workspacesStr,
    prompt: options.prompt,
    promptFile: options.promptFile,
  })
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
