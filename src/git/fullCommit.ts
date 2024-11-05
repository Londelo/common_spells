#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, config } from 'shelljs'

const DEFAULT_MESSAGE = 'small change made, for the betterment of all (maybe)'

const fullCommit = async () => {
  config.silent = true
  config.fatal = true

  const currentBranch = exec("git branch --show-current").stdout
    .replace('\n', '')
    .toUpperCase()

  let message = process.argv.slice(2).join(' ')
  if(!message) {
    message = DEFAULT_MESSAGE
  }

  const commitMessage = `${currentBranch}: ${message}`

  exec('git add .')
  exec(`git commit -m "${commitMessage}"`)
  exec('git push')

  echo(chalk.green.italic("Commit Complete."))
  echo(chalk.italic(`message: "${commitMessage}"`))
}

(async () => await fullCommit())();
