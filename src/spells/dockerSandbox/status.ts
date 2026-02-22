#!/usr/bin/env node
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { displayStatus } from '../../shared/dockerSandbox/status'

const errorMessage = 'Error in dockerSandbox status'

const main = async (): Promise<void> => {
  await displayStatus()
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
