#!/usr/bin/env node
/* eslint-disable id-length */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-depth */
import { exec, echo } from 'shelljs';
import inquirer from 'inquirer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import errorHandlerWrapper from '../shared/errorHandlerWrapper';
import {
  yellow, red, green
} from '../shared/colors';

const SPELLS_CONFIG = path.join( os.homedir(), '.spells' );
const NAV_KEY = 'navDir';
const errorMessage = '\'Navigation failed.\'';

function getConfig() {
  if ( !fs.existsSync( SPELLS_CONFIG ) ) { return {}; }
  const content = fs.readFileSync( SPELLS_CONFIG, 'utf8' );
  return Object.fromEntries( content.split( '\n' ).filter( Boolean ).map( ( line ) => line.split( '=' ) ) );
}

function setConfig( key: string, value: string ) {
  const config = getConfig();
  config[key] = value;
  const newContent = Object.entries( config ).map( ( [ k, v ] ) => `${k}=${v}` ).join( '\n' );
  fs.writeFileSync( SPELLS_CONFIG, newContent );
}

function getNavDir() {
  const config = getConfig();
  return config[NAV_KEY];
}

async function findDirs( base: string, keyword?: string ): Promise<string[]> {
  const results: string[] = [];
  function walk( dir: string ) {
    const entries = fs.readdirSync( dir, { withFileTypes: true } );
    for ( const entry of entries ) {
      if ( entry.isDirectory() ) {
        const fullPath = path.join( dir, entry.name );
        if ( !keyword || entry.name.toLowerCase().includes( keyword.toLowerCase() ) ) {
          results.push( fullPath );
        }
        walk( fullPath );
      }
    }
  }
  walk( base );
  return results;
}

async function nav() {
  const args = process.argv.slice( 2 );
  if ( args[0] === '--config' && args[1] ) {
    setConfig( NAV_KEY, args[1] );
    echo( green( `Navigation base directory set to: ${args[1]} "bob"` ) );
    return;
  }

  const navDir = getNavDir();
  if ( !navDir ) {
    echo( red( 'No base navigation directory set. Please run: nav --config [base nav search directory]' ) );
    return;
  }

  let openAfter = false;
  let keyword = '';
  for ( let i = 0; i < args.length; i++ ) {
    if ( args[i] === '-o' || args[i] === '--open' ) { openAfter = true; } else { keyword = args[i]; }
  }

  const matches = await findDirs( navDir, keyword );
  if ( matches.length === 0 ) {
    echo( red( 'No matching directories found.' ) );
    return;
  }
  let chosen = matches[0];
  if ( matches.length > 1 ) {
    const answer = await inquirer.prompt( [
      {
        type: 'list',
        name: 'dir',
        message: 'Select a directory:',
        choices: matches
      }
    ] );
    chosen = answer.dir;
  }
  process.chdir( chosen );
  echo( green( `Navigated to: ${chosen}` ) );
  if ( openAfter ) {
    echo( yellow( 'Opening in VS Code...' ) );
    exec( 'code .' );
  }
}

( async() => errorHandlerWrapper( nav, errorMessage ) )();
