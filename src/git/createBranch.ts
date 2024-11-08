#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, config, exit } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import fullUpdate from './fullUpdate'

const errorMessage = 'FAILED to build new branch'

const createBranch = async () => {

  const defaultBranch = exec(
    "git remote show origin | grep 'HEAD branch' | awk '{print $NF}'",
    {silent:true}
  ).stdout
  .replace('\n', '')

  const currentBranch = exec(
    "git branch --show-current",
    {silent:true}
  ).stdout
  .replace('\n', '')

  const newBranch = process.argv[2]
  if(!newBranch) {
    echo(chalk.red.italic('please provide a branch name: "branch [new branch name]"'))
    exit(1)
  }

  const checkoutBranch = currentBranch !== defaultBranch ? defaultBranch : null
  fullUpdate(checkoutBranch)
  echo(chalk.yellow.italic(`creating new branch: `) + chalk.italic(newBranch))
  exec(`git checkout -b ${newBranch}`)
  echo(chalk.green.italic('New Branch Built'))
}

(async () => await errorHandlerWrapper(createBranch, errorMessage))();
