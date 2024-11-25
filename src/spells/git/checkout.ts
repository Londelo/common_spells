#!/usr/bin/env node
import { exec, echo, exit, config } from 'shelljs'
import inquirer from 'inquirer'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper';
import { selectDefaultBranch, selectTruthyItems } from '../../shared/selectors';
import { green, yellow } from '../../shared/colors';

const errorMessage = `FAILED to switch branches`

const NormalizeBranchNames = (defaultBranch: string) => (name: string) => {
  const isCurrentBranch = name.includes('*')
  if(isCurrentBranch) {
    return ''
  }

  const splitName = name.trim().split(' ').filter(selectTruthyItems)
  const newName = splitName.map((part, index) => {
    const isBranchName = index === 0
    if(isBranchName) {
      if(part.includes(defaultBranch)) {
        return `${part} ${green('(default)').dim}`
      }
      return `${part}    `
    }

    return yellow(part).dim
  })

  return newName.join(' ')
}

async function selectBranch() {
  const defaultBranch = await selectDefaultBranch()

  const branchNames = exec('git branch -vv').stdout
  .split('\n')
  .slice(0, -1)
  .map(NormalizeBranchNames(defaultBranch))
  .filter(selectTruthyItems)


  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: 'Choose your destination, my love.',
      choices: branchNames
    }
  ]);

  return answers.branch
    .replace(' (default)', '')
    .split(' ')[0]
}

async function switchBranch(branchName: string) {
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
