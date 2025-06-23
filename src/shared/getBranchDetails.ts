#!/usr/bin/env node
import { exec } from 'shelljs'
import { convertDate, selectTruthyItems } from './selectors'

const selectLastCommitDate = (branchName: string) => {
  const date = exec(`git log -1 --format='%ci' "${branchName}"`, { silent: true }).stdout
  return convertDate.full(date)
}

function isBranchStale(lastCommitDate: string): boolean {
  const givenDate = new Date(lastCommitDate);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  return givenDate < threeMonthsAgo;
}

export type BranchDetails = { name: string, isStale: boolean, location: 'local'|'remote', lastCommitDate: string }
export type CollectionOfBranches = { [key in string]: BranchDetails }
export type AllBranchDetails = BranchDetails[]

const collectBranchDetails = (collection: CollectionOfBranches, details: string) => {
  const branchName = details.trim().replace('*','').split(' ').filter(selectTruthyItems)[0]
  const isLocal = !branchName.includes('remotes/')
  const isRemote = branchName.includes('remotes/origin/') && !branchName.includes('HEAD')
  const lastCommitDate = selectLastCommitDate(branchName)

  if(isLocal) {
    const isStale = isBranchStale(lastCommitDate)

    const branchDetails: BranchDetails = {
      name: branchName,
      isStale,
      location: 'local',
      lastCommitDate
    }

    return {
      ...collection,
      [branchName]: branchDetails
    }
  }

  if(isRemote) {
    const normalizedName: string = branchName.replace('remotes/origin/','')
    const collectedAlready = collection[normalizedName]
    const isStale = isBranchStale(lastCommitDate)

    if(collectedAlready) {
      return collection
    }

    const branchDetails: BranchDetails = {
      name: normalizedName,
      isStale,
      location: 'remote',
      lastCommitDate
    }

    return {
      ...collection,
      [normalizedName]: branchDetails
    }
  }

  return collection
}

const getBranchDetails = async (all = true): Promise<AllBranchDetails> => {
  const getBranchCommand = all ? 'git branch -a -vv' : 'git branch -vv'
  const allBranchDetails = await exec(getBranchCommand, { silent: true }).stdout
  .split('\n')
  .slice(0, -1)
  .reduce(collectBranchDetails, {} as CollectionOfBranches)

  return Object.values(allBranchDetails)
}

export default getBranchDetails
