import { echo } from 'shelljs'
import { green, yellow, red } from '../colors'
import { DockerSessionResult } from './launchDockerSandbox'

const reportDockerResults = (results: DockerSessionResult[]): void => {
  const running = results.filter((r) => r.status === 'running')
  const failed = results.filter((r) => r.status === 'failed')

  echo(green(`\n✓ Launched ${running.length} Docker sandbox(es):`))

  results.forEach((result, index) => {
    const num = index + 1
    if (result.status === 'failed') {
      echo(red(`  ${num}. ${result.displayName} — FAILED: ${result.error}`))
      return
    }
    echo(green(`  ${num}. ${result.displayName} — running`))
    echo(yellow(`     Sandbox: ${result.sandboxName}`))
    echo(yellow(`     Log: ${result.logFile}`))
  })

  if (failed.length > 0) {
    echo(red(`\n✗ ${failed.length} session(s) failed to launch`))
  }

  echo(yellow('\nDocker sandboxes are running in background.'))
  echo(yellow('Documentation will be written to the workspace directory.\n'))

  echo(yellow('Monitor progress:'))
  running.forEach((r) => echo(yellow(`  tail -f ${r.logFile}`)))

  echo(yellow('\nCleanup sandboxes:'))
  running.forEach((r) => echo(yellow(`  docker sandbox rm ${r.sandboxName}`)))
}

export default reportDockerResults
