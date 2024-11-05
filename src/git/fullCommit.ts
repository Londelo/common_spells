#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, config, exit } from 'shelljs'

const DEFAULT_MESSAGE = 'small change made, for the betterment of all (maybe)'

const fullCommit = async () => {
  config.fatal = true

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

  try {
    echo(chalk.yellow.italic('git add .'))
    exec('git add .')
    echo(chalk.yellow.italic(`git commit -m "${commitMessage}"`))
    exec(`git commit -m "${commitMessage}"`)
    echo(chalk.yellow.italic('git push'))
    exec('git push')
  } catch(err) {
    echo(chalk.red.italic(`FAILED to commit message: "${commitMessage}"`))
    exit(1)
  }

  echo(chalk.green.italic("\nCommit Complete."))
}

(async () => await fullCommit())();
