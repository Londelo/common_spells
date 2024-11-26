#!/usr/bin/env node
import { exec, echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { selectAllArgs, selectCurrentBranch } from '../../shared/selectors'
import { green, yellow } from '../../shared/colors'

const DEFAULT_MESSAGE = 'small change made, for the betterment of all (maybe)'
const errorMessage = 'FAILED to commit message'

const fullCommit = async () => {
  const currentBranch = (await selectCurrentBranch()).toUpperCase()

  let message = selectAllArgs()
  if(!message) {
    message = DEFAULT_MESSAGE
  }

  const commitMessage = `${currentBranch}: ${message}`

  echo(yellow('git add .'))
  await exec('git add .')
  echo(yellow(`git commit -m "${commitMessage}"`))
  await exec(`git commit -m "${commitMessage}"`)
  echo(yellow('git push'))
  await exec('git push')

  echo(green("Commit Complete."))
}

(async () => await errorHandlerWrapper(fullCommit, errorMessage))();
