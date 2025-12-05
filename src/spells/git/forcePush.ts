#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { green, yellow } from '../../shared/colors'
import { execute } from '../../shared/shell'
import { selectAllArgs } from '../../shared/selectors'

const errorMessage = 'you are not a true dragon born.'
const dangerousPush = '--dangerous'

const forcePush = async () => {
  echo(green('FUS-RO-DAAAAAHHH!'))

  const allArguments = selectAllArgs()
  const dangerouslyPush = allArguments.includes(dangerousPush)

  if(dangerouslyPush) {
    const command = 'git push --force --no-verify'
    echo(yellow(command))
    await execute(command, 'Failed to dangerously force push')
  } else {
    const command = 'git push --force-with-lease --no-verify'
    echo(yellow(command))
    await execute(command, 'Failed to safely force push')
  }
}

(async () => await errorHandlerWrapper(forcePush, errorMessage))();
