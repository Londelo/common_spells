#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import { selectCurrentBranch } from '../shared/selectors'

const DEFAULT_MESSAGE = 'small change made, for the betterment of all (maybe)'
const errorMessage = 'FAILED to commit message'

const fullCommit = async () => {
  const currentBranch = (await selectCurrentBranch()).toUpperCase()

  let message = process.argv.slice(2).join(' ')
  if(!message) {
    message = DEFAULT_MESSAGE
  }

  const commitMessage = `${currentBranch}: ${message}`

  echo(chalk.yellow.italic('git add .'))
  await exec('git add .')
  echo(chalk.yellow.italic(`git commit -m "${commitMessage}"`))
  await exec(`git commit -m "${commitMessage}"`)
  echo(chalk.yellow.italic('git push'))
  await exec('git push')

  echo(chalk.green.italic("Commit Complete."))
}

(async () => await errorHandlerWrapper(fullCommit, errorMessage))();
