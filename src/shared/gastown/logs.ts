import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { cyan, yellow } from '../colors'
import { LOG_DIR, OUTPUT_DIR } from './types'

// --- Types ---

type LogOptions = {
  readonly follow?: boolean
  readonly lines?: number
  readonly showOutput?: boolean
  readonly showAll?: boolean
  readonly pattern?: string
}

type LogFile = {
  readonly path: string
  readonly name: string
  readonly timestamp: number
}

// --- File Discovery ---

const ensureDirectory = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const getFiles = (dir: string, ext: string): readonly LogFile[] => {
  ensureDirectory(dir)

  try {
    const entries = fs.readdirSync(dir)
    const files = entries
      .filter((name: string) => name.endsWith(`.${ext}`))
      .map((name: string) => {
        const filePath = path.join(dir, name)
        const stats = fs.statSync(filePath)
        return {
          path: filePath,
          name,
          timestamp: stats.mtimeMs,
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)

    return files
  } catch {
    return []
  }
}

const filterFilesByPattern = (files: readonly LogFile[], pattern: string): readonly LogFile[] =>
  files.filter((file: LogFile) => file.name.includes(pattern)).slice(0, 10)

const selectFiles = (
  files: readonly LogFile[],
  showAll: boolean,
  pattern?: string
): readonly LogFile[] => {
  if (pattern) {
    return filterFilesByPattern(files, pattern)
  }

  return showAll ? files.slice(0, 10) : files.slice(0, 1)
}

// --- Display Functions ---

const listFiles = (dir: string, ext: string, label: string): void => {
  echo(cyan(`=== ${label} ===`))

  const files = getFiles(dir, ext)

  if (files.length === 0) {
    echo('  None')
    return
  }

  files.slice(0, 20).forEach((file: LogFile) => {
    const timestamp = new Date(file.timestamp).toLocaleString()
    echo(`  ${file.name} (${timestamp})`)
  })
}

const showLogContent = async (file: LogFile, lines: number): Promise<void> => {
  echo(cyan(`=== ${file.name} ===`))

  try {
    const command = `tail -n ${lines} "${file.path}"`
    echo(yellow(command))
    const content = await execute(command, 'Read log file')
    echo(content)
  } catch (error) {
    echo(yellow('Could not read file'))
  }

  echo('')
}

const followLogs = async (files: readonly LogFile[], lines: number): Promise<void> => {
  const paths = files.map((f: LogFile) => `"${f.path}"`).join(' ')

  echo(cyan(`Following: ${files.map((f: LogFile) => f.name).join(', ')}`))
  echo('Press Ctrl+C to stop')
  echo('---')

  try {
    const command = `tail -f -n ${lines} ${paths}`
    echo(yellow(command))
    await execute(command, 'Follow logs')
  } catch {
    // Ctrl+C will throw, which is expected
  }
}

// --- Main Functions ---

export const listLogs = (): void => listFiles(LOG_DIR, 'log', 'Log files')

export const listOutputs = (): void => listFiles(OUTPUT_DIR, 'json', 'Output files')

export const showLogs = async (options: LogOptions = {}): Promise<void> => {
  const { follow = false, lines = 50, showOutput = false, showAll = false, pattern } = options

  const targetDir = showOutput ? OUTPUT_DIR : LOG_DIR
  const fileExt = showOutput ? 'json' : 'log'

  const allFiles = getFiles(targetDir, fileExt)

  if (allFiles.length === 0) {
    echo(yellow(`No ${fileExt} files found`))
    return
  }

  const selectedFiles = selectFiles(allFiles, showAll, pattern)

  if (selectedFiles.length === 0) {
    echo(yellow(`No files match pattern: ${pattern}`))
    echo('')
    echo('Available files:')
    allFiles.slice(0, 5).forEach((file: LogFile) => echo(`  ${file.name}`))
    return
  }

  if (follow) {
    await followLogs(selectedFiles, lines)
  } else {
    await selectedFiles.reduce(
      async (promise: Promise<void>, file: LogFile) => {
        await promise
        await showLogContent(file, lines)
      },
      Promise.resolve()
    )
  }
}

export const findLogByPattern = (pattern: string, showOutput = false): LogFile | null => {
  const targetDir = showOutput ? OUTPUT_DIR : LOG_DIR
  const fileExt = showOutput ? 'json' : 'log'
  const files = getFiles(targetDir, fileExt)
  const matches = filterFilesByPattern(files, pattern)
  return matches.length > 0 ? matches[0] : null
}
