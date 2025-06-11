import fs from 'fs';
import os from 'os';
import path from 'path';

const SPELLS_CONFIG = path.join( os.homedir(), '.spells' );

function getConfig() {
  if ( !fs.existsSync( SPELLS_CONFIG ) ) { return {}; }
  const content = fs.readFileSync( SPELLS_CONFIG, 'utf8' );
  return Object.fromEntries( content.split( '\n' ).filter( Boolean ).map( ( line ) => line.split( '=' ) ) );
}

function setConfig( key: string, value: string ) {
  const config = getConfig();
  config[key] = value;
  const newContent = Object.entries( config ).map( ( [ _k, _v ] ) => `${_k}=${_v}` ).join( '\n' );
  fs.writeFileSync( SPELLS_CONFIG, newContent );
}

export {
  getConfig, setConfig, SPELLS_CONFIG
};
