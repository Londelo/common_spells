#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, config, exit } from 'shelljs'

const createBranch = async () => {
  // config.silent = true
  config.fatal = true

  const defaultBranch = exec(
    "git remote show origin | grep 'HEAD branch' | awk '{print $NF}'",
    {silent:true}
  ).stdout
  .replace('\n', '')

  const currentBranch = exec(
    "git branch --show-current",
    {silent:true}
  ).stdout
  .replace('\n', '')

  const newBranch = process.argv[2]
  if(!newBranch) {
    echo(chalk.red.italic('please provide a branch name: "branch [new branch name]"'))
    exit(1)
  }

  try {
    if(currentBranch !== defaultBranch) {
      echo(chalk.yellow.italic(`moving to default branch: `) + chalk.italic(defaultBranch))
      exec(`git checkout ${defaultBranch}`, {silent:true})
    }
    echo(chalk.yellow.italic('updating local branch'))
    exec('git fetch')
    exec('git pull')
    echo(chalk.yellow.italic(`creating new branch: `) + chalk.italic(newBranch))
    exec(`git checkout -b ${newBranch}`)
    echo(chalk.green.italic('New Branch Built'))
  } catch(err) {
    echo(chalk.red.italic(`FAILED to build new branch: "${newBranch}"`))
    exit(1)
  }
}

(async () => await createBranch())();


//get default branch
//git fetch and pull
//git checkout -b branch name
