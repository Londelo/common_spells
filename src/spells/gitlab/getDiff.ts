#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import { selectMrBranch } from '../../shared/glab/getGitLabMrs'
import { yellow } from '../../shared/colors'
import copyToClipboard from '../../shared/copyToClipboard'
import getProjectFullPath from '../../shared/glab/getProjectFullPath'
import { execute } from '../../shared/shell'
import { selectAllArgs } from '../../shared/selectors'
import getMrId from '../../shared/glab/getMrId'
import checkForGlab from '../../shared/glab/checkForGlab'

const errorMessage = 'FAILED to get diff'
const useCurrentBranch = '-c'
const useCurrentBranchFull = '--current'

const getMrDiff = async(branch: string, colors: string) => {
  const command = `glab mr diff "${branch}" --color ${colors}  --raw`
  if(colors === 'always') echo(yellow(command))
  return await execute(command, "Failed to get MR diff")
}

const getDiff = async () => {
  await checkForGlab()

  const allArguments = selectAllArgs()
  const getCurrentBranch = allArguments.includes(useCurrentBranch) || allArguments.includes(useCurrentBranchFull)

  let selectedMr
  if (getCurrentBranch) {
    const mrId = await getMrId()
    selectedMr = { id: mrId, branch: 'current', title: 'Current Branch MR' }
  } else {
    echo(yellow('Fetching GitLab branches with MRs...'))
    selectedMr = await selectMrBranch()
  }

  const diff = await getMrDiff(selectedMr.id, 'always')
  echo(diff)

  const repo = await getProjectFullPath()

  const diffNoColors = await getMrDiff(selectedMr.id, 'never')

  copyToClipboard(
    `You are a master at gitlab and here are the changes made to ${repo}, in ${selectedMr} branch #codebase
    \n\n${diffNoColors}`
  )
}

(async () => await errorHandlerWrapper(getDiff, errorMessage))()
