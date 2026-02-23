#!/usr/bin/env node
import { echo } from 'shelljs'
import inquirer from 'inquirer'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { execute } from '../../shared/shell'
import { selectCurrentBranch } from '../../shared/selectors'
import { cyan, green, red, yellow } from '../../shared/colors'
import setup from '../../shared/dockerSandbox/setup'
import runSingleAgent from '../../shared/dockerSandbox/runSingleAgent'

const CODEMON_PLUGIN = 'codemon'
const PROTECTED_BRANCHES = ['main', 'master', 'develop']

const extractDirName = (pwd: string): string => pwd.split('/').filter(Boolean).pop() || 'unknown'

const getCurrentDirName = async (): Promise<string> => {
  const pwd = await execute('pwd', 'Failed to get current directory')
  return extractDirName(pwd.trim())
}

const isProtectedBranch = (branch: string): boolean =>
  PROTECTED_BRANCHES.includes(branch.toLowerCase())

const confirmProtectedBranch = async (branch: string): Promise<boolean> => {
  echo(yellow(`\n⚠ Warning: You are on the '${branch}' branch`))

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you sure you want to run CodeMon on this branch?',
      default: false,
    },
  ])

  return confirmed
}

const errorMessage = 'Error in cmon'

const cmon = async () => {
  echo(cyan('=== CodeMon - Starting Docker Sandbox ===\n'))

  const dirName = await getCurrentDirName()

  let branch: string
  try {
    branch = await selectCurrentBranch()
  } catch {
    echo(red('✗ Error: Not in a Git repository'))
    echo(yellow('\nPlease run this command from within a Git repository.'))
    return
  }

  if (isProtectedBranch(branch)) {
    const confirmed = await confirmProtectedBranch(branch)
    if (!confirmed) {
      echo(yellow('\nCancelled'))
      return
    }
  }

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
