#!/usr/bin/env node
import { exec, echo } from 'shelljs'
import { selectDefaultBranch } from './selectors'
import { yellow } from './colors'

const fetchAndPull = async (branch: string) => {
  const defaultBranch = await selectDefaultBranch()
  const pullCommand = defaultBranch === branch ? `git pull origin ${branch}` : 'git pull'
  echo(yellow('git fetch --all'))
  await exec('git fetch --all')
  echo(yellow(pullCommand))
  await exec(pullCommand)
}

export default fetchAndPull
