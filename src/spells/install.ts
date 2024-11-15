#!/usr/bin/env node
import { exec, echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import { green, yellow } from '../shared/colors'

const errorMessage = 'FAILED to install'
const findNpmLockFile = 'find . -path ./package-lock.json'
const findYarnLockFile = 'find . -path ./yarn.lock'

const install = async () => {
  const npmLockFile = exec(findNpmLockFile).stdout
  const yarnLockFile = exec(findYarnLockFile).stdout
  const installParams = process.argv.slice(2).join(' ') || ''
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
  exec(installCommand)
  echo(green('Install Complete!'))
}

(async () => await errorHandlerWrapper(install, errorMessage))();
