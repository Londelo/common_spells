import fs from 'fs';
import os from 'os';
import path from 'path';
import { echo } from 'shelljs';
import { red } from './colors';
import inquirer from 'inquirer';
import { green } from 'colors';

const changeDirectoryFuncName = 'changeDirectory';
const changeDirectoryFunc = `
${changeDirectoryFuncName}() {
  cd "$@"
}
`;

const ShellFunctions = {[changeDirectoryFuncName]: { name: changeDirectoryFuncName, function: changeDirectoryFunc }};
export type ShellFunctionName = keyof typeof ShellFunctions;

async function confirmWithUserFirst( rcFile: string, shellFunctionName: ShellFunctionName ): Promise<boolean> {
  const { confirmAppend } = await inquirer.prompt( [
    {
      type: 'confirm',
      name: 'confirmAppend',
      message: `Do you want to add the '${shellFunctionName}' shell function to your shell config (${rcFile})?`,
      default: false
    }
  ] );
  if ( !confirmAppend ) {
    echo( red( 'Aborted: No changes made to your shell config.' ) );
    process.exit( 0 );
  }
  return true;
}

function getShellRcFile( shellFunctionName: ShellFunctionName ): { fileContent: string; filePath: string; } {
  const filePath = getFilePath();

  const rcExists = fs.existsSync( filePath || '' );
  if ( !filePath || !rcExists ) {
    echo( red( 'Could not determine shell rc file. Please add the following function manually to your shell config:' ) );
    echo( ShellFunctions[shellFunctionName].function );
    process.exit( 0 );
  }

  return { fileContent: fs.readFileSync( filePath, 'utf8' ), filePath};
}

function getFilePath(): string | null {
  const homeDir = os.homedir();
  const shell = process.env.SHELL || '';

  if ( shell.includes( 'zsh' ) ) {
    return path.join( homeDir, '.zshrc' );
  }
  if ( shell.includes( 'bash' ) ) {
    return path.join( homeDir, '.bashrc' );
  }
  return null;
}

export default async function appendShellFunction( shellFunctionName: ShellFunctionName ) {
  const { fileContent, filePath } = getShellRcFile( shellFunctionName );

  const noShellFunction = !fileContent.includes( ShellFunctions[shellFunctionName].name );
  if ( noShellFunction ) {
    await confirmWithUserFirst( filePath, shellFunctionName );
    const newContent = `added by common_spells\n${ShellFunctions[shellFunctionName].function}`;
    fs.appendFileSync( filePath, newContent );
    echo( green( `Added new function to ${filePath}. Please restart your terminal or run 'source ${filePath}'.` ) );
    echo( ShellFunctions[shellFunctionName].function );
  }
}

export function checkForShellFunction( shellFunctionName: ShellFunctionName ): boolean {
  const { fileContent } = getShellRcFile( shellFunctionName );
  return fileContent.includes( ShellFunctions[shellFunctionName].name );
}


