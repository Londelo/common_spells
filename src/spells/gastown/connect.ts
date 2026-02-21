#!/usr/bin/env node

import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { connect } from '../../shared/gastown/connect'

const errorMessage = 'Error in gastown connect'

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const sandboxName = args[0]

  await connect({ sandboxName })
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
