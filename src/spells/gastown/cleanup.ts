#!/usr/bin/env node
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
    await cleanup()
  }
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
