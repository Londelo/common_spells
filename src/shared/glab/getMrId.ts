import { echo } from 'shelljs'
import { yellow } from '../colors'
import { execute } from '../shell'

async function getMrId(branch: string = ''): Promise<string> {
  const command = `glab mr view ${branch} -F json`
  echo(yellow(command))
  const result = await execute(command, 'Failed to get MR information')
  const mr = JSON.parse(result)
  return mr.iid.toString()
}

export default getMrId
