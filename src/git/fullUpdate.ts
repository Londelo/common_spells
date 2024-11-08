#!/usr/bin/env node
import { echo } from 'shelljs'
import chalk from 'chalk'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import fetchAndPull from '../shared/fetchAndPull'

const errorMessage = 'FAILED to update branch'

const fullUpdate = async () => {
  fetchAndPull()
  echo(chalk.green.italic("Update Complete."))
}

(async () => await errorHandlerWrapper(fullUpdate, errorMessage))();
