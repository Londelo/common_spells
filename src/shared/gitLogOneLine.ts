#!/usr/bin/env node
import { exec, echo } from 'shelljs'
import { yellow } from './colors'
import inquirer from 'inquirer'

const formatLogs = (logs: string, showAll: boolean) =>
  logs.split('\n')
  .map(log => {
    const logParts = log.split(' ')
    logParts[0] = `  ${yellow(logParts[0])}`
    return logParts.join(' ')
  })
  .slice(0, showAll ? -1 : 10)
  .join('\n')

const selectCommitTag = (answer: {log:string}) => answer.log.split(' ')[0]

async function selectLog(logs: string) {
  const logsArray = logs.split('\n')

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'log',
      message: 'Choose your destination, my love.',
      choices: logsArray
    }
  ]);

  return selectCommitTag(answers)
}

const gitLogOneLine = async (select: boolean = false, showAll: boolean = false) => {
  const logCommand = 'git log --oneline \n'
  echo(yellow(logCommand))
  const unformattedLogs = await exec(logCommand, { silent: true }).stdout
  const logs = formatLogs(unformattedLogs, showAll)

  if(select) {
    return await selectLog(logs)
  }

  echo(logs)
}

export default gitLogOneLine

export type GitLogTriggers = '-l' | '--log'

export const gitLogTriggers: GitLogTriggers[] = ['-l', '--log']
