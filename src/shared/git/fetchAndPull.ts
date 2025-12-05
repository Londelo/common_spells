#!/usr/bin/env node
import { echo } from 'shelljs'
import { selectDefaultBranch } from '../selectors'
import { yellow } from '../colors'
import { execute } from '../shell'

const fetchAndPull = async (branch: string) => {
  const defaultBranch = await selectDefaultBranch()
  const pullCommand = defaultBranch === branch ? `git pull origin ${branch}` : 'git pull'
  const fetchCommand = 'git fetch --all'
  echo(yellow(fetchCommand))
  await execute(fetchCommand, 'Failed to fetch all', {silent: false})
  echo(yellow(pullCommand))
  await execute(pullCommand, 'Failed to pull updates', {silent: false})
}

export default fetchAndPull
