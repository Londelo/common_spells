import inquirer from 'inquirer'

const input = async (message: string, defaultValue?: string): Promise<string> => {
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue
    }
  ])
  return answer.value
}

const confirm = async (message: string, defaultValue: boolean = true): Promise<boolean> => {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'value',
      message,
      default: defaultValue
    }
  ])
  return answer.value
}

const select = async (message: string, choices: string[]): Promise<string> => {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message,
      choices
    }
  ])
  return answer.value
}

export { input, confirm, select }
