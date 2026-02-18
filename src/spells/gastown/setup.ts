#!/usr/bin/env node
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import dccSetup from '../../shared/gastown/checkSetup'

const errorMessage = 'Error in gastown setup'

const main = async (): Promise<void> => {
  await dccSetup()
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
