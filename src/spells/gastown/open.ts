#!/usr/bin/env node

import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { execute } from '../../shared/shell'
import { GT_DIR } from '../../shared/gastown/types'
import colors from 'colors'

const errorMessage = 'Error opening gastown directory'

const main = async (): Promise<void> => {
  console.log(colors.cyan('Opening ~/.gastown in VS Code...'))

  await execute(`code "${GT_DIR}"`, "Failed to open gastown home dir in vscode")

  console.log(colors.green('✓ Opened ~/.gastown'))
}

;(async () => await errorHandlerWrapper(main, errorMessage))()
