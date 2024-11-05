#!/usr/bin/env node
import chalk from 'chalk'
import { exec, echo, config } from 'shelljs'

const fullCommit = async () => {
  config.fatal = true

  // get current branch "git branch --show-current"
  // account for no message
  // git add .
  // git commit -m
  // git push
}

(async () => await fullCommit())();
