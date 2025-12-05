import { echo } from 'shelljs'
import { yellow } from '../colors'
import { execute } from '../shell'

async function getProjectFullPath() {
  const command = `glab repo view -F json`
  echo(yellow(command))
  const result = await execute(command, 'Failed to get project information')
  const repo = JSON.parse(result)
  return repo.path_with_namespace
}

export default getProjectFullPath
