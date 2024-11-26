#!/usr/bin/env node
import { echo, exec } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import fetchAndPull from '../../shared/fetchAndPull'
import { selectAllArgs, selectCurrentBranch, selectTruthyItems } from '../../shared/selectors'
import { green, yellow } from '../../shared/colors'
import collectAllBranchDetails, { AllBranchDetails } from '../../shared/collectBranchDetails'

const errorMessage = 'FAILED to update branch'


async function connectToActiveRemoteBranches(branchDetails: AllBranchDetails) {
  for (let index = 0; index < branchDetails.length; index++) {
    const {name, isStale, location} = branchDetails[index];
    if(isStale && location === 'local') {
      echo(yellow(`git branch -D ${name}`))
      await exec(`git branch -D ${name}`)
    }
  }
}

async function purgeStaleLocalBranches(branchDetails: AllBranchDetails) {
  for (let index = 0; index < branchDetails.length; index++) {
    const {name, isStale, location} = branchDetails[index];
    if(!isStale && location === 'remote') {
      echo(yellow(`git branch ${name} origin/${name}`))
      await exec(`git branch ${name} origin/${name}`)
    }
  }
}

const fullUpdate = async () => {
  const currentBranch = await selectCurrentBranch()
  await fetchAndPull(currentBranch)
  const args = selectAllArgs()
  if(args.includes('--purge')) {
    const allBranchDetails = await collectAllBranchDetails()
    await purgeStaleLocalBranches(allBranchDetails)
    await connectToActiveRemoteBranches(allBranchDetails)
  }

  echo(green("Update Complete."))
}

(async () => await errorHandlerWrapper(fullUpdate, errorMessage))();
