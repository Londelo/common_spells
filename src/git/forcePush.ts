#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo } from 'shelljs'

const forcePush = async () => {
  echo(chalk.green.bold('FUS-RO-DAAAAAHHH!'))
  const result = await exec('git push --force --no-verify')
  const error = result.code !== 0

  if (error) {
    echo(chalk.red.italic('you are not a true dragon born.'))
  }
}

(async () => await forcePush())();
