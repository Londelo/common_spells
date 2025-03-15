#!/usr/bin/env node
import { exec, echo, exit, config } from 'shelljs'
import inquirer from 'inquirer'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper';
import { selectCurrentBranch, selectDefaultBranch, selectTruthyItems } from '../../shared/selectors';
import { green, red, yellow } from '../../shared/colors';
import getBranchDetails, { BranchDetails } from '../../shared/getBranchDetails';

const errorMessage = `FAILED to switch branches`

const NormalizeBranchNames = (defaultBranch: string, currentBranch: string) =>
  (collection: string[], { name, isStale, lastCommitDate }: BranchDetails ) => {
    const isCurrentBranch = currentBranch === name
    if(isCurrentBranch) {
      return collection
    }

    const defaultTag = defaultBranch === name ? green('(default)') : ''
    const staleTag = isStale ? red('(stale)') : yellow('(not-stale)').dim
    const lastUpdated = yellow(`last-updated: ${lastCommitDate}`).dim

    return [
      ...collection,
      `${name} ${defaultTag} ${staleTag} ${lastUpdated}`
    ]
  }

async function selectBranch() {
  const defaultBranch = await selectDefaultBranch()
  const currentBranch = await selectCurrentBranch()

  const branchNames = (await getBranchDetails(false))
    .reduce(NormalizeBranchNames(defaultBranch, currentBranch), [] as string[])

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: 'Choose your destination, my love.',
      choices: branchNames
    }
  ]);

  return answers.branch.split(' ')[0]
}

async function switchBranch(branchName: string) {
  if(branchName === 'default') {
    branchName = await selectDefaultBranch()
  }
  echo(yellow(`git checkout ${branchName}`))
  await exec(`git checkout ${branchName}`)
  echo(green("Switched"))
  exit(0)
}

const checkOut = async () => {
  config.silent = true

  let branchName = process.argv[2]
  if(branchName) {
    await switchBranch(branchName)
  }

  branchName = await selectBranch()
  await switchBranch(branchName)
}

(async () => await errorHandlerWrapper(checkOut, errorMessage))();
