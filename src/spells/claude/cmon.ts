#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { execute } from '../../shared/shell'
import { cyan, green } from '../../shared/colors'
import setup from '../../shared/dockerSandbox/setup'
import runSingleAgent from '../../shared/dockerSandbox/runSingleAgent'

const CODEMON_PLUGIN = 'codemon'

const extractDirName = (pwd: string): string => pwd.split('/').filter(Boolean).pop() || 'unknown'

const getCurrentDirName = async (): Promise<string> => {
  const pwd = await execute('pwd', 'Failed to get current directory')
  return extractDirName(pwd.trim())
}

const getCurrentBranch = async (): Promise<string> => {
  const branch = await execute('git branch --show-current', 'Failed to get current branch')
  return branch.trim()
}

const errorMessage = 'Error in cmon'

const cmon = async () => {
  echo(cyan('=== CodeMon - Starting Docker Sandbox ===\n'))

  const dirName = await getCurrentDirName()
  const branch = await getCurrentBranch()
  const sandboxName = `${dirName}-${branch}`

  echo(green(`Directory: ${dirName}`))
  echo(green(`Branch: ${branch}`))
  echo(green(`Sandbox: ${sandboxName}\n`))

  // Run setup with codemon plugin
  echo(cyan('=== Setting up Docker Sandbox with codemon plugin ===\n'))
  await setup(CODEMON_PLUGIN)

  // Launch sandbox
  echo(cyan('\n=== Launching CodeMon Sandbox ===\n'))
  await runSingleAgent({
    sandboxName,
    workspace: './',
  })

  echo(green('\n=== CodeMon session complete ==='))
}

;(async () => await errorHandlerWrapper(cmon, errorMessage))()
