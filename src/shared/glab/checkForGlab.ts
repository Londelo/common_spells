import { execSync } from 'child_process';

export default async function checkForGlab() {
  try {
    await execSync('glab --version', { stdio: 'ignore' });
  } catch (error) {
    throw new Error('glab is missing, please globally install glab');
  }
}
