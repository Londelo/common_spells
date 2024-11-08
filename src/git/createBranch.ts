#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, config, exit } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import fullUpdate from './fullUpdate'
import { selectDefaultBranch, selectCurrentBranch } from '../shared/selectors'

const errorMessage = 'FAILED to build new branch'

const createBranch = async () => {

  const defaultBranch = selectDefaultBranch()
  const currentBranch = selectCurrentBranch()

  const newBranch = process.argv[2]
  if(!newBranch) {
    echo(chalk.red.italic('please provide a branch name: "branch [new branch name]"'))
    exit(1)
  }

  if(currentBranch !== defaultBranch ) {
    echo(chalk.yellow.italic(`moving to default branch: `) + chalk.italic(defaultBranch))
    await exec(`git checkout ${defaultBranch}`, {silent:true})
  }
  fullUpdate()
  echo(chalk.yellow.italic(`creating new branch: `) + chalk.italic(newBranch))
  exec(`git checkout -b ${newBranch}`)
  echo(chalk.green.italic('New Branch Built'))
}

(async () => await errorHandlerWrapper(createBranch, errorMessage))();
