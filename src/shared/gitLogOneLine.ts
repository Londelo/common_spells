#!/usr/bin/env node
import { exec, echo } from 'shelljs'
import { yellow } from './colors'

const stylizeLogs = (logs: string) =>
  logs.split('\n')
  .map(log => {
    const logParts = log.split(' ')
    logParts[0] = `  ${yellow(logParts[0])}`
    return logParts.join(' ')
  })
  .join('\n')

const gitLogOneLine = async () => {
  const logCommand = 'git log --oneline \n'
  echo(yellow(logCommand))
  const logs = await exec(logCommand, { silent: true }).stdout
  echo(stylizeLogs(logs))
}

export default gitLogOneLine

export const gitLogTriggers = ['-l', '--log']
