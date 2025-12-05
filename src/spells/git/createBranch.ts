#!/usr/bin/env node
import { exec, echo, exit } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { selectDefaultBranch, selectCurrentBranch, selectAllArgs } from '../../shared/selectors'
import fetchAndPull from '../../shared/git/fetchAndPull'
import { green, red, yellow } from '../../shared/colors'

const errorMessage = 'FAILED to build new branch'
const branchFromCurrent = '-c'
const branchFromCurrentFull = '--current'

const createBranch = async () => {

  const defaultBranch = await selectDefaultBranch()
  const currentBranch = await selectCurrentBranch()

  const allArguments = selectAllArgs()
  const stayOnCurrentBranch = allArguments.includes(branchFromCurrent) || allArguments.includes(branchFromCurrentFull)

  const newBranch = allArguments
    .replace(branchFromCurrent, '')
    .replace(branchFromCurrentFull, '')
    .trim()

  if(!newBranch) {
    echo(red('please provide a branch name: "branch [new branch name]"'))
    exit(1)
  }

  if(!stayOnCurrentBranch && currentBranch !== defaultBranch) {
    echo(yellow(`moving to default branch: `) + defaultBranch)
    await exec(`git checkout ${defaultBranch}`, {silent:true})
    await fetchAndPull(defaultBranch)
  }
  echo(yellow(`git checkout -b ${newBranch}`))
  exec(`git checkout -b ${newBranch}`)
  echo(green('New Branch Built'))
}

(async () => await errorHandlerWrapper(createBranch, errorMessage))();
