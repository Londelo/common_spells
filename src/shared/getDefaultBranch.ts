import { exec } from "shelljs"

const getDefaultBranch = () => {
  const defaultBranch = exec(
    "git remote show origin | grep 'HEAD branch' | awk '{print $NF}'",
    {silent:true}
  ).stdout
  .replace('\n', '')
  return defaultBranch
}

export default getDefaultBranch
