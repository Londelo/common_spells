#!/usr/bin/env node
import { echo, exec } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import fetchAndPull from '../../shared/fetchAndPull'
import { selectCurrentBranch, selectTruthyItems } from '../../shared/selectors'
import { green } from '../../shared/colors'

const errorMessage = 'FAILED to update branch'

function isBranchStale(branchName: string): boolean {
  const lastCommitDate = exec(`git log -1 --format='%ci' ${branchName}`, { silent: true }).stdout

  const givenDate = new Date(lastCommitDate);
  const threeMonthsAgo = new Date();

  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 6);

  return givenDate < threeMonthsAgo;
}

type BranchDetails = { name: string, isStale: boolean, location: 'local'|'remote'}
type CollectionOfBranches = { [key in string]: BranchDetails }
const collectBranchDetails = (collection: CollectionOfBranches, name: string) => {
  const branchName = name.trim().replace('*','').split(' ').filter(selectTruthyItems)[0]
  const isLocal = !branchName.includes('remotes/')
  const isRemote = branchName.includes('remotes/origin/') && !branchName.includes('HEAD')

  if(isLocal) {
    const isStale = isBranchStale(branchName)

    const branchDetails: BranchDetails = {
      name: branchName,
      isStale,
      location: 'local'
    }

    return {
      ...collection,
      [branchName]: branchDetails
    }
  }

  if(isRemote) {
    const normalizedName: string = branchName.replace('remotes/origin/','')
    const collectedAlready = collection[normalizedName]
    const isStale = isBranchStale(`origin/${normalizedName}`)

    if(collectedAlready) {
      return collection
    }

    const branchDetails: BranchDetails = {
      name: normalizedName,
      isStale,
      location: 'remote'
    }

    return {
      ...collection,
      [normalizedName]: branchDetails
    }
  }

  return collection
}

async function connectToActiveBranches() {

  const branchDetails = exec('git branch -a -vv', { silent: true }).stdout
  .split('\n')
  .slice(0, -1)
  .reduce(collectBranchDetails, {} as CollectionOfBranches)

  const branchDetailsArray = Object.values(branchDetails)
  for (let index = 0; index < branchDetailsArray.length; index++) {
    const {name, isStale, location} = branchDetailsArray[index];
    if(!isStale && location === 'remote') {
      await exec(`git branch ${name} origin/${name}`)
    }
  }
}


const fullUpdate = async () => {
  const currentBranch = await selectCurrentBranch()
  await fetchAndPull(currentBranch)
  await connectToActiveBranches()
  echo(green("Update Complete."))
}

(async () => await errorHandlerWrapper(fullUpdate, errorMessage))();
