import { execute } from '../shell'
import { echo } from 'shelljs'
import { green, red } from '../colors'

const DCC_DEFAULT_DIR = '/Users/Brodie.Balser/Documents/WizWork/docker-claude-code'
const DCC_DIR = process.env.DCC_DIR || DCC_DEFAULT_DIR
const DCC_RUN_SCRIPT = `${DCC_DIR}/scripts/dcc-run.sh`

const checkDockerInstalled = async (): Promise<void> => {
  try {
    await execute('docker --version', 'Docker check')
  } catch {
    throw new Error(
      'Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop'
    )
  }
}

const checkSandboxSupport = async (): Promise<void> => {
  try {
    await execute('docker sandbox --help', 'Docker sandbox check')
  } catch {
    throw new Error(
      'Docker sandbox support not found. Update Docker Desktop to v29+ for sandbox feature.'
    )
  }
}

const checkDccScripts = async (): Promise<void> => {
  try {
    await execute(`test -f "${DCC_RUN_SCRIPT}"`, 'DCC scripts check')
  } catch {
    throw new Error(
      `docker-claude-code scripts not found at ${DCC_DIR}\n` +
        'Clone from: https://git.tmaws.io/Camille.Clayton/docker-claude-code\n' +
        'Or set DCC_DIR environment variable to the cloned repo location.'
    )
  }
}

const validateDockerEnvironment = async (): Promise<void> => {
  await checkDockerInstalled()
  await checkSandboxSupport()
  await checkDccScripts()
  echo(green('✓ Docker environment validated'))
}

export { DCC_DIR, DCC_RUN_SCRIPT }
export default validateDockerEnvironment
