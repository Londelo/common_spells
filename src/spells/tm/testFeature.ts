#!/usr/bin/env node
import {
  exec, echo, exit
} from 'shelljs';
import errorHandlerWrapper from '../../shared/errorHandlerWrapper';
import inquirer from 'inquirer';
import {
  green, red, yellow
} from '../../shared/colors';
import { selectAllArgs } from '../../shared/selectors';

const errorMessage = 'FAIL to run test';

const normalizeGrepData = ( data: RegExpMatchArray | null ) => data ? `@${data[1].trim()}` : '*unidentified tag*';

const beSilent = { silent: true };

const getAllTags = () => {
  const tagReg = /@(.+)/;
  const greppedTags = exec(
    'grep -r -n --include="*.feature" --exclude-dir=node_modules -E "@" .',
    beSilent
  ).stdout
    .split( './' )
    .slice( 1 );

  const tags = greppedTags.map( ( line ) => {
    const tag = line.match( tagReg );
    return normalizeGrepData( tag );
  } );
  return tags;
};

async function selectTag( tags: string[] ) {

  if( !tags.length ) {
    echo( red( 'I could not find any test tags for you.' ) );
    exit( 1 );
  }

  const answers = await inquirer.prompt( [
    {
      type: 'list',
      name: 'tag',
      message: 'All tests are available for your selection.',
      choices: tags
    }
  ] );

  return answers.tag.replace( '* ', '' );
}

const runTest = ( testCommand: string ) => {
  try {
    echo( yellow( testCommand ) );
    exec( testCommand );
    echo( green( 'All tests are complete.' ) );
    exit( 0 );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch( err: any ) {
    if( err.message.includes( 'minimatch' ) ) {
      echo( red( 'You cant run tests here.' ) );
      exit( 1 );
    }

    if( testCommand.includes( 'features' ) ) {
      runTest( testCommand.replace( 'features', 'tests' ) );
    }

    echo( yellow( err.message ) );
    exit( 1 );
  }
};

const checkPartialMatches = ( tags: string[], testParams: string ) => {
  let exactMatch = '';

  const partialMatches: string[] = [];

  const firstLetter = testParams[0];
  const firstLetterMatches: string[] = [];

  tags.forEach( ( tag ) => {

    if( tag === testParams ) {
      exactMatch = tag;
    }

    if( tag.includes( testParams ) ) {
      partialMatches.push( tag );
    }

    if( tag.includes( firstLetter ) ) {
      firstLetterMatches.push( tag );
    }
  } );

  return {exactMatch,
    matches: partialMatches.length ? partialMatches : firstLetterMatches};
};

const testFeature = async() => {
  const testParams = selectAllArgs();
  const tags = getAllTags();

  if( testParams ) {
    const { exactMatch,  matches } = checkPartialMatches( tags, testParams );

    if( exactMatch ) {
      runTest( `npx run features:tags ${exactMatch}` );
    }

    const tag = await selectTag( matches );
    runTest( `npx run features:tags ${tag}` );
  }

  const tag = await selectTag( tags );
  runTest( `npx run features:tags ${tag}` );
};

( async() => errorHandlerWrapper( testFeature, errorMessage ) )();
