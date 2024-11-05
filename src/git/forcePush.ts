#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo } from 'shelljs'

const fusrodah = async () => {
  echo(chalk.green.bold('FUS-RO-DAAAAAHHH!'))
  const result = await exec('git push --bob')

  if (result.code !== 0) {
    console.log(result)
    echo(chalk.red.bold('you are not a truly dragon born.'))
  } else {
    echo(chalk.green.bold('FUS-RO-DAAAAAHHH!'))
  }
}

(async () => await fusrodah())();
