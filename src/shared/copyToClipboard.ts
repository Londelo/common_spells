import { echo, exec } from 'shelljs'
import { green } from './colors'

const copyToClipboard = (data: any) => {
  const jsonOutput = JSON.stringify(data)
  exec(`echo '${jsonOutput.replace(/'/g, "'\\''")}' | pbcopy`, { silent: true })
  echo(green('\n✓ Copied to clipboard'))
}

export default copyToClipboard
