#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { selectAllArgs, selectCurrentBranch } from '../../shared/selectors'
import { green, yellow } from '../../shared/colors'
import { execute } from '../../shared/shell'

const DEFAULT_MESSAGE = 'small change'
const errorMessage = 'FAILED to commit message'
const skipAddArg = '-sa'
const skipAddArgFull = '--skip-add'

const fullCommit = async () => {
  const currentBranch = (await selectCurrentBranch()).toUpperCase()

  let message = selectAllArgs()
  if(!message) {
    message = DEFAULT_MESSAGE
  }

  const skipGitAdd = message.includes(skipAddArg) || message.includes(skipAddArgFull)
  if(!skipGitAdd) {
    echo(yellow('git add .'))
    await execute('git add .', 'Failed to git add')
  } else {
    message = message
      .replace(skipAddArg, '')
      .replace(skipAddArgFull, '')
      .trim()
  }

  const commitMessage = `${currentBranch}: ${message}`
  echo(yellow(`git commit -m "${commitMessage}"`))
  await execute(`git commit -m "${commitMessage}"`, 'Failed to git commit')
  echo(yellow('git push'))
  await execute('git push', 'Failed to push')

  echo(green("Commit Complete."))
}

(async () => await errorHandlerWrapper(fullCommit, errorMessage))();
