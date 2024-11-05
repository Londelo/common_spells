#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'

const errorMessage = 'you are not a true dragon born.'

const forcePush = async () => {
  echo(chalk.green.bold('FUS-RO-DAAAAAHHH!'))
  exec('git push --force --no-verify')
}

(async () => await errorHandlerWrapper(forcePush, errorMessage))();
