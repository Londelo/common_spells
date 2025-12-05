#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import { green, yellow } from '../shared/colors'
import { selectAllArgs } from '../shared/selectors'
import { execute } from '../shared/shell'

const errorMessage = 'FAILED to install'
const findNpmLockFile = 'find . -path ./package-lock.json'
const findYarnLockFile = 'find . -path ./yarn.lock'

const install = async () => {
  const npmLockFile = await execute(findNpmLockFile, 'Failed to find lock file for npm')
  const yarnLockFile = await execute(findYarnLockFile, 'Failed to find lock file for yarn')
  const installParams = selectAllArgs() || ''
  let installCommand = ''

  if(npmLockFile) {
    installCommand = `npm install ${installParams}`
  }
  else if(yarnLockFile) {
    if(installParams) {
      installCommand = `yarn add ${installParams}`
    } else {
      installCommand = 'yarn'
    }
  }

  echo(yellow(installCommand))
  await execute(installCommand, `Failed to run: ${installCommand}`)
  echo(green('Install Complete!'))
}

(async () => await errorHandlerWrapper(install, errorMessage))();
