#!/usr/bin/env node

import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { execute } from '../../shared/shell'
import { DS_DIR } from '../../shared/dockerSandbox/types'
import colors from 'colors'

const errorMessage = 'Error opening dockerSandbox directory'

const main = async (): Promise<void> => {
  console.log(colors.cyan('Opening ~/.dockerSandbox in VS Code...'))

  await execute(`code "${DS_DIR}"`, "Failed to open dockerSandbox home dir in vscode")

  console.log(colors.green('✓ Opened ~/.dockerSandbox'))
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
