#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, exit } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { selectDefaultBranch, selectCurrentBranch } from '../../shared/selectors'
import fetchAndPull from '../../shared/fetchAndPull'

const errorMessage = 'FAILED to build new branch'

const createBranch = async () => {

  const defaultBranch = await selectDefaultBranch()
  const currentBranch = await selectCurrentBranch()

  const newBranch = process.argv[2]
  if(!newBranch) {
    echo(chalk.red.italic('please provide a branch name: "branch [new branch name]"'))
    exit(1)
  }

  if(currentBranch !== defaultBranch ) {
    echo(chalk.yellow.italic(`moving to default branch: `) + chalk.italic(defaultBranch))
    await exec(`git checkout ${defaultBranch}`, {silent:true})
  }
  await fetchAndPull(defaultBranch)
  echo(chalk.yellow.italic(`creating new branch: `) + chalk.italic(newBranch))
  exec(`git checkout -b ${newBranch} origin/${newBranch}`)
  echo(chalk.green.italic('New Branch Built'))
}

(async () => await errorHandlerWrapper(createBranch, errorMessage))();
