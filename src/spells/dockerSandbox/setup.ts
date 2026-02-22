#!/usr/bin/env node
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import setup from '../../shared/dockerSandbox/setup'

const errorMessage = 'Error in dockerSandbox setup'

const main = async (): Promise<void> => {
  await setup()
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
