#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import { selectCurrentBranch } from '../shared/selectors'

const errorMessage = 'FAILED to update branch'

const fullUpdate = async () => {
  echo(chalk.yellow.italic('git fetch'))
  await exec('git fetch')
  echo(chalk.yellow.italic('git pull'))
  await exec(`git pull`)
  echo(chalk.green.italic("Update Complete."))
}

(async () => await errorHandlerWrapper(fullUpdate, errorMessage))();

export default fullUpdate
