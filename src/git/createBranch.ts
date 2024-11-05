#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, config } from 'shelljs'

const createBranch = async () => {
  config.silent = true
  config.fatal = true

  const defaultBranch = exec("git remote show origin | grep 'HEAD branch' | awk '{print $NF}'").stdout
    .replace('\n', '')

  console.log(defaultBranch)
}

(async () => await createBranch())();


//get default branch
//git fetch and pull
//git checkout -b branch name
