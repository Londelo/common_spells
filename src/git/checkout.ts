#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, exit, config } from 'shelljs'
import inquirer from 'inquirer'

async function selectBranch() {
  const branchNames = exec('git branch').stdout
  .split('\n')
  .slice(0, -1)
  .map(name => name.trim())

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'branch',
      message: 'Choose your destination, my love.',
      choices: branchNames
    }
  ]);

  return answers.branch.replace('* ', '')
}

function switchBranch(branchName: string) {
  exec(`git checkout ${branchName}`)
  echo(chalk.green.italic("Switched"))
}

const checkOut = async () => {
  config.fatal = true
  config.silent = true

  try {
    let branchName = process.argv[2]
    if(branchName) {
      switchBranch(branchName)
    }

    branchName = await selectBranch()
    switchBranch(branchName)
  } catch (error) {
    echo(chalk.red.italic(`FAILED to switch branches`))
    exit(1)
  }

}

(async () => await checkOut())();
