import fs from 'fs'
import path from 'path'
import { echo } from 'shelljs'
import { execute } from '../shell'
import { green, red, cyan, yellow } from '../colors'
import { LOG_DIR, OUTPUT_DIR } from './types'

// --- Types ---

type TaskOptions = {
  readonly sandbox: string
  readonly prompt: string
  readonly promptFile?: string
  readonly outputFile?: string
  readonly wait?: boolean
}

type TaskResult = {
  readonly taskId: string
  readonly sandbox: string
  readonly outputFile: string
  readonly logFile: string
  readonly status: 'running' | 'completed'
}

// --- Validation ---

const checkSandboxExists = async (sandboxName: string): Promise<boolean> => {
  try {
    const output = await execute('docker sandbox ls 2>/dev/null', 'List sandboxes')
    return output.includes(sandboxName)
  } catch {
    return false
  }
}

const listRunningSandboxes = async (): Promise<readonly string[]> => {
  try {
    const output = await execute(
      'docker sandbox ls --format "{{.Name}}" 2>/dev/null',
      'List sandbox names'
    )
    return output.split('\n').filter((name: string) => name.trim().length > 0)
  } catch {
    return []
  }
}

// --- Prompt Handling ---

const readPromptFromFile = (filePath: string): string => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${filePath}`)
  }

  return fs.readFileSync(filePath, 'utf-8').trim()
}

const escapePromptForShell = (prompt: string): string =>
  prompt.replace(/'/g, "'\\''")

// --- Task Execution ---

const ensureDirectories = (): void => {
  ;[LOG_DIR, OUTPUT_DIR].forEach((dir: string) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

const generateTaskId = (): string => `task-${Date.now()}`

const buildTaskPaths = (sandbox: string, taskId: string, outputFile?: string) => {
  const defaultOutput = path.join(OUTPUT_DIR, `${sandbox}-${taskId}.json`)
  const logFile = path.join(LOG_DIR, `${sandbox}-${taskId}.log`)

  return {
    outputFile: outputFile || defaultOutput,
    logFile,
  }
}

const writeTaskLog = (logFile: string, taskId: string, sandbox: string, prompt: string): void => {
  const logContent = [
    `Task: ${taskId}`,
    `Sandbox: ${sandbox}`,
    `Started: ${new Date().toISOString()}`,
    `Prompt: ${prompt.slice(0, 200)}${prompt.length > 200 ? '...' : ''}`,
    '---',
  ].join('\n')

  fs.writeFileSync(logFile, logContent + '\n')
}

const appendTaskCompletion = (logFile: string): void => {
  const completionLine = `\n\nCompleted: ${new Date().toISOString()}\n`
  fs.appendFileSync(logFile, completionLine)
}

const executeTaskInSandbox = async (
  sandbox: string,
  prompt: string,
  outputFile: string,
  logFile: string,
  wait: boolean
): Promise<void> => {
  const escapedPrompt = escapePromptForShell(prompt)
  const claudeCommand = `echo '${escapedPrompt}' | claude -p --output-format stream-json --verbose`
  const dockerCommand = `docker exec "${sandbox}" bash -c "${claudeCommand}"`

  if (wait) {
    // Foreground execution with live output
    await execute(`${dockerCommand} 2>&1 | tee "${outputFile}" | tee -a "${logFile}"`, 'Run task')
    appendTaskCompletion(logFile)
    echo('')
    echo(green('Task completed'))
  } else {
    // Background execution
    const backgroundCommand = `(${dockerCommand} > "${outputFile}" 2>&1; echo "" >> "${logFile}"; echo "Completed: $(date)" >> "${logFile}") &`

    await execute(backgroundCommand, 'Start background task')

    echo('')
    echo(green('Task started in background'))
    echo('')
    echo('Commands:')
    echo(yellow(`  tail -f ${outputFile}  # Watch output`))
    echo(yellow(`  cat ${outputFile}      # View result`))
  }
}

// --- Main Function ---

export const sendTask = async (options: TaskOptions): Promise<TaskResult> => {
  const { sandbox, promptFile, outputFile, wait = false } = options

  ensureDirectories()

  // Validate sandbox exists
  const exists = await checkSandboxExists(sandbox)
  if (!exists) {
    const running = await listRunningSandboxes()
    echo(red(`Error: Sandbox '${sandbox}' not found`))
    echo('')
    echo('Running sandboxes:')
    if (running.length > 0) {
      running.forEach((name: string) => echo(`  ${name}`))
    } else {
      echo('  None')
    }
    throw new Error(`Sandbox not found: ${sandbox}`)
  }

  // Get prompt
  const prompt = promptFile ? readPromptFromFile(promptFile) : options.prompt

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required')
  }

  // Setup task
  const taskId = generateTaskId()
  const { outputFile: finalOutputFile, logFile } = buildTaskPaths(sandbox, taskId, outputFile)

  echo(cyan(`Sending task to ${sandbox}...`))
  echo(`  Task ID: ${taskId}`)
  echo(`  Output:  ${finalOutputFile}`)

  // Log task details
  writeTaskLog(logFile, taskId, sandbox, prompt)

  // Execute
  await executeTaskInSandbox(sandbox, prompt, finalOutputFile, logFile, wait)

  return {
    taskId,
    sandbox,
    outputFile: finalOutputFile,
    logFile,
    status: wait ? 'completed' : 'running',
  }
}

export const sendTaskFromStdin = async (
  sandbox: string,
  stdin: string,
  wait = false
): Promise<TaskResult> => sendTask({ sandbox, prompt: stdin, wait })
