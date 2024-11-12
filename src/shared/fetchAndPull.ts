#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo } from 'shelljs'
import { selectDefaultBranch } from './selectors'

const fetchAndPull = async (branch: string) => {
  const defaultBranch = await selectDefaultBranch()
  const pullCommand = defaultBranch === branch ? `git pull origin ${branch}` : 'git pull'
  echo(chalk.yellow.italic('git fetch --all'))
  await exec('git fetch --all')
  echo(chalk.yellow.italic(pullCommand))
  await exec(pullCommand)
}

export default fetchAndPull
