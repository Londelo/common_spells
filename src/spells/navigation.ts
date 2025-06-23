#!/usr/bin/env node

/* eslint-disable max-depth */
import {
  exec, echo, cd
} from 'shelljs';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import errorHandlerWrapper from '../shared/errorHandlerWrapper';
import {
  yellow, red, green
} from '../shared/colors';
import { getConfig, setConfig } from '../shared/spellConfigs';
import { selectAllArgs } from '../shared/selectors';
import appendShellFunction, { checkForShellFunction, ShellFunctionName } from '../shared/appendShellFunction';

const NAV_KEY = 'navDir';
const errorMessage = '\'Navigation failed.\'';
const CONFIG_PARAM = '--config';
const OPEN_PARAM_SHORT = '-o';
const OPEN_PARAM_LONG = '--open';
const changeDirectoryFuncName: ShellFunctionName = 'changeDirectory';

function executeConfigCommand( args: string ): void {
  const baseDir = args.replace( CONFIG_PARAM, '' ).trim();
  if ( !baseDir ) {
    echo( red( `Missing the base nav search directory. Please run: nav ${CONFIG_PARAM} [base nav search directory]` ) );
    return;
  }
  setConfig( NAV_KEY, baseDir );
  echo( green( `Navigation base directory set to: ${baseDir}` ) );
}

async function executeChangeDirectory( chosenPath?: string ) {
  echo( `${changeDirectoryFuncName} ${chosenPath}` );
  await exec( `${changeDirectoryFuncName} ${chosenPath}` );
}

function getNavDir() {
  const config = getConfig();
  return config[NAV_KEY];
}

function isGitRepo( dir: string ): boolean {
  return fs.existsSync( path.join( dir, '.git' ) );
}

async function findDirs( base: string, keyword: string = '' ) {
  const paths: string[] = [];
  const dirNames: string[] = [];
  let exactMatch: { name: string; path: string } | null = null;

  function walk( dir: string ) {
    const entries = fs.readdirSync( dir, { withFileTypes: true } );
    for ( const entry of entries ) {
      if ( entry.isDirectory() ) {
        const fullPath = path.join( dir, entry.name );

        if ( isGitRepo( fullPath ) ) {
          const isPartialMatch = entry.name.toLowerCase().includes( keyword.toLowerCase() );

          if ( !keyword || isPartialMatch ) {
            paths.push( fullPath );
            paths.push( dir );
            dirNames.push( entry.name );
          }

          if ( keyword === entry.name ) {
            exactMatch = { name: entry.name, path: fullPath };
          }
        } else {
          walk( fullPath );
        }
      }
    }
  }

  walk( base );
  return {
    paths, dirNames, exactMatch
  };
}

function shouldOpenAfter( args: string ): boolean {
  return args.includes( OPEN_PARAM_SHORT ) || args.includes( OPEN_PARAM_LONG );
}

async function nav() {
  const args = selectAllArgs();
  const isConfigCommand = args.includes( CONFIG_PARAM );
  if ( isConfigCommand ) {
    await appendShellFunction( changeDirectoryFuncName );
    executeConfigCommand( args );
    return;
  }

  const navDir = getNavDir();
  if ( !navDir || !checkForShellFunction( changeDirectoryFuncName ) ) {
    echo( red( `Please run: nav ${CONFIG_PARAM} [base nav search directory]` ) );
    return;
  }

  const openAfter = shouldOpenAfter( args );

  const keyword = args
    .replace( OPEN_PARAM_LONG, '' )
    .replace( OPEN_PARAM_SHORT, '' )
    .trim();

  const {
    paths, dirNames, exactMatch
  } = await findDirs( navDir, keyword );

  if ( paths.length === 0 ) {
    echo( red( 'No matching directories found.' ) );
    return;
  }

  // if ( exactMatch ) {
  //   await executeChangeDirectory( exactMatch.name, exactMatch.path );
  // }

  const answer = await inquirer.prompt( [
    {
      type: 'list',
      name: 'dir',
      message: 'Select a directory:',
      choices: dirNames
    }
  ] );
  const chosen = answer.dir;
  const chosenPath = paths.find( ( _path ) => _path.includes( chosen ) );
  await executeChangeDirectory( chosenPath );
  if ( openAfter ) {
    echo( yellow( 'Opening in VS Code...' ) );
    exec( 'code .' );
  }
}

( async() => errorHandlerWrapper( nav, errorMessage ) )();
