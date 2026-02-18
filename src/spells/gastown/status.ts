#!/usr/bin/env node
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { displayStatus } from '../../shared/gastown/status'

const errorMessage = 'Error in gastown status'

const main = async (): Promise<void> => {
  await displayStatus()
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
