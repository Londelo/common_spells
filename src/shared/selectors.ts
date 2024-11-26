import { exec } from "shelljs"

const dateOptions: any = {
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: "2-digit",
};

const convertDate = {
  'milliseconds': (date: number|string) => new Date(date).getTime(),
  'full': (date: number|string) => new Date(date).toLocaleDateString('en-us', dateOptions)
}

let selectAllArgs = () => process.argv.slice(2).join(' ')

const selectTruthyItems = (item: unknown) => !!item

const selectDefaultBranch = async () =>
  exec(
    "git remote show origin | grep 'HEAD branch' | awk '{print $NF}'",
    {silent:true}
  ).stdout
  .replace('\n', '')

const selectCurrentBranch = async () =>
  exec(
    "git branch --show-current",
    {silent:true}
  ).stdout
  .replace('\n', '')

export {
  selectTruthyItems,
  selectCurrentBranch,
  selectDefaultBranch,
  selectAllArgs,
  convertDate
}
