#!/usr/bin/env node
import { exec } from 'shelljs'
import { selectTruthyItems } from './selectors'

function isBranchStale(branchName: string): boolean {
  const lastCommitDate = exec(`git log -1 --format='%ci' ${branchName}`, { silent: true }).stdout

  const givenDate = new Date(lastCommitDate);
  const threeMonthsAgo = new Date();

  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 6);

  return givenDate < threeMonthsAgo;
}

export type BranchDetails = { name: string, isStale: boolean, location: 'local'|'remote'}
export type CollectionOfBranches = { [key in string]: BranchDetails }
export type AllBranchDetails = BranchDetails[]

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

const collectAllBranchDetails = async (): Promise<AllBranchDetails> => {
  const allBranchDetails = await exec('git branch -a -vv', { silent: true }).stdout
  .split('\n')
  .slice(0, -1)
  .reduce(collectBranchDetails, {} as CollectionOfBranches)

  return Object.values(allBranchDetails)
}

export default collectAllBranchDetails
