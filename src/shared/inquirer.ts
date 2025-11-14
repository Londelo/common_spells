import inquirer from 'inquirer'

const input = async (message: string): Promise<string> => {
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message
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

export { input, confirm }
