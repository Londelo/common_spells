#!/usr/bin/env node
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import setup from '../../shared/gastown/setup'

const errorMessage = 'Error in gastown setup'

const main = async (): Promise<void> => {
  await setup()
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
