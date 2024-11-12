#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, exit, config } from 'shelljs'
import inquirer from 'inquirer'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper';
import { selectDefaultBranch, selectTruthyItems } from '../../shared/selectors';

const errorMessage = `FAILED to switch branches`

async function selectBranch() {
  const defaultBranch = await selectDefaultBranch()

  const branchNames = exec('git branch -vv').stdout
  .split('\n')
  .slice(0, -1)
  .map(name => {
    if(name.includes('*')) {
      return ''
    }

    const splitName = name.trim().split(' ').filter(selectTruthyItems)
    const newName = splitName.map((part, index) => {
      if(part.includes(defaultBranch)) {
        return `${chalk.green('(default)')} ${part}    `
      }
      if(index === 0) {
        return `${part}    `
      }

      return chalk.yellow.dim.italic(part)
    })

    return newName.join(' ')
  })
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
    .replace('(default) ', '')
    .split(' ')[0]
}

async function switchBranch(branchName: string) {
  echo(chalk.yellow.italic(`git checkout ${branchName}`))
  await exec(`git checkout ${branchName}`)
  echo(chalk.green.italic("Switched"))
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
