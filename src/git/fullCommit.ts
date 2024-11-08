#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, config, exit } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'

const DEFAULT_MESSAGE = 'small change made, for the betterment of all (maybe)'
const errorMessage = 'FAILED to commit message'

const fullCommit = async () => {
  const currentBranch = exec(
    "git branch --show-current",
    {silent:true}
  ).stdout
  .replace('\n', '')
  .toUpperCase()

  let message = process.argv.slice(2).join(' ')
  if(!message) {
    message = DEFAULT_MESSAGE
  }

  const commitMessage = `${currentBranch}: ${message}`

  echo(chalk.yellow.italic('git add .'))
  exec('git add .')
  echo(chalk.yellow.italic(`git commit -m "${commitMessage}"`))
  exec(`git commit -m "${commitMessage}"`)
  echo(chalk.yellow.italic('git push'))
  exec('git push')

  echo(chalk.green.italic("Commit Complete."))
}

(async () => await errorHandlerWrapper(fullCommit, errorMessage))();
