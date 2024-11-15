#!/usr/bin/env node
import { exec, echo, exit } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { selectDefaultBranch, selectCurrentBranch } from '../../shared/selectors'
import fetchAndPull from '../../shared/fetchAndPull'
import { green, red, yellow } from '../../shared/colors'

const errorMessage = 'FAILED to build new branch'

const createBranch = async () => {

  const defaultBranch = await selectDefaultBranch()
  const currentBranch = await selectCurrentBranch()

  const newBranch = process.argv[2]
  if(!newBranch) {
    echo(red('please provide a branch name: "branch [new branch name]"'))
    exit(1)
  }

  if(currentBranch !== defaultBranch ) {
    echo(yellow(`moving to default branch: `) + defaultBranch)
    await exec(`git checkout ${defaultBranch}`, {silent:true})
  }
  await fetchAndPull(defaultBranch)
  echo(yellow(`git checkout -b ${newBranch}`))
  exec(`git checkout -b ${newBranch}`)
  echo(green('New Branch Built'))
}

(async () => await errorHandlerWrapper(createBranch, errorMessage))();
