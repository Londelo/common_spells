#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'

const errorMessage = 'FAILED to commit message'

const fullUpdate = async (checkoutBranch:string|null = null) => {
  if(checkoutBranch) {
    echo(chalk.yellow.italic(`moving to default branch: `) + chalk.italic(checkoutBranch))
    exec(`git checkout ${checkoutBranch}`, {silent:true})
  }
  echo(chalk.yellow.italic('updating local branch'))
  exec('git fetch')
  exec('git pull')

  echo(chalk.green.italic("Update Complete."))
}

(async () => await errorHandlerWrapper(fullUpdate, errorMessage))();

export default fullUpdate
