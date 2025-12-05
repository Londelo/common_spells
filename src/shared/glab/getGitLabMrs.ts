#!/usr/bin/env node
import inquirer from 'inquirer'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { yellow } from '../colors'

export type GitLabMR = {
  branch: string
  title: string
  id: string
}

const parseMrLine = (line: string): GitLabMR | null => {
  const trimmedLine = line.trim()
  if (!trimmedLine) return null

  const mrNumberMatch = trimmedLine.match(/(!(\d+))\s/)
  if (!mrNumberMatch) return null
  const id = mrNumberMatch[1]

  const branchMatch = trimmedLine.match(/\(.*?\)\s*←\s*\(([^)]+)\)/)
  if (!branchMatch) return null
  const branch = branchMatch[1]

  const titleMatch = trimmedLine.match(/!\d+\s+[^!]+!\d+\s+(.+?)\s+\(/)
  if (!titleMatch) return null
  const title = titleMatch[1].trim()

  return { branch, title, id }
}

const getGitLabMrs = async (): Promise<GitLabMR[]> => {
  const command = 'glab mr list'
  echo(yellow(command))
  const result = await execute(command, 'Failed to get list of MRs')
  const lines = result.split('\n').filter((line: string) => line.trim())

  const formattedMrs: GitLabMR[] = []

  for (const line of lines) {
    const mr = parseMrLine(line)
    if (mr) {
      formattedMrs.push(mr)
    }
  }

  return formattedMrs
}

async function selectMrBranch() {
  const mrList = await getGitLabMrs()

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mr',
      message: 'Select a merge request:',
      choices: mrList.map(mr => `Branch: ${mr.branch}\n\tTitle: ${mr.title}`)
    }
  ])

  return mrList.find(mr => answers.mr.includes(mr.branch)) as GitLabMR
}

export {
  getGitLabMrs,
  selectMrBranch
}
