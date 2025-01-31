#!/usr/bin/env node
import { exec, echo, exit, config } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper';
import { green, red, yellow } from '../../shared/colors';
import gitLogOneLine from '../../shared/gitLogOneLine';

const errorMessage = `FAILED to rebase commits`

const rebaseCommits = async () => {
  const selectLogs = true
  const commitTag = await gitLogOneLine(selectLogs)
  const rebaseCommand = `git rebase -i ${commitTag}`
  echo(yellow(rebaseCommand))
  exec(rebaseCommand, {async: true})
  echo(green('Your rebasing now!'))
}

(async () => await errorHandlerWrapper(rebaseCommits, errorMessage))();
