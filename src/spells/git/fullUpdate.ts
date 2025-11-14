#!/usr/bin/env node
import { echo, exec } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import fetchAndPull from '../../shared/git/fetchAndPull'
import { selectAllArgs, selectCurrentBranch, selectDefaultBranch } from '../../shared/selectors'
import { green, yellow } from '../../shared/colors'
import getBranchDetails, { AllBranchDetails } from '../../shared/git/getBranchDetails'

const errorMessage = 'FAILED to update branch'

async function connectToActiveRemoteBranches(branchDetails: AllBranchDetails) {
  for (let index = 0; index < branchDetails.length; index++) {
    const {name, isStale, location} = branchDetails[index];
    if(!isStale && location === 'remote') {
      echo(yellow(`\n(link) git branch ${name} origin/${name}`))
      await exec(`git branch ${name} origin/${name}`)
    }
  }
}

async function purgeStaleLocalBranches(branchDetails: AllBranchDetails) {
  const defaultBranch = await selectDefaultBranch()

  for (let index = 0; index < branchDetails.length; index++) {
    const {name, isStale, location} = branchDetails[index];
    if(isStale && location === 'local' && name !== defaultBranch) {
      echo(yellow(`\n(delete) git branch -D ${name}`))
      await exec(`git branch -D ${name}`)
    }
  }
}

const fullUpdate = async () => {
  const currentBranch = await selectCurrentBranch()
  await fetchAndPull(currentBranch)

  const args = selectAllArgs()
  if(args.includes('--purge')) {
    echo(yellow('\nPreparing to Purge Foul Branches...'))
    const allBranchDetails = await getBranchDetails()
    await purgeStaleLocalBranches(allBranchDetails)
    await connectToActiveRemoteBranches(allBranchDetails)
  }

  echo(green("Update Complete."))
}

(async () => await errorHandlerWrapper(fullUpdate, errorMessage))();
