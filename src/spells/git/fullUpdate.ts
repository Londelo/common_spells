#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import fetchAndPull from '../../shared/fetchAndPull'
import { selectCurrentBranch } from '../../shared/selectors'
import { green } from '../../shared/colors'

const errorMessage = 'FAILED to update branch'

const fullUpdate = async () => {
  const currentBranch = await selectCurrentBranch()
  await fetchAndPull(currentBranch)
  echo(green("Update Complete."))
}

(async () => await errorHandlerWrapper(fullUpdate, errorMessage))();
