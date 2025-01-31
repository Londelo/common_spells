#!/usr/bin/env node
import { exec, echo } from 'shelljs'
import { yellow } from './colors'

const gitLogOneLine = async (branch: string) => {
  const logCommand = 'git log --oneline'
  echo(yellow(logCommand))
  await exec(logCommand)
}

export default gitLogOneLine
