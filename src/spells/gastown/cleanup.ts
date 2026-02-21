#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { cleanup, cleanupAll } from '../../shared/gastown/cleanup'

const errorMessage = 'Error in gastown cleanup'

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const target = args[0]

  if (target === '--all') {
    await cleanupAll()
  } else if (target) {
    await cleanup({ target })
  } else {
    echo('Please specify a target or use --all to clean up all sandboxes')
  }
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
