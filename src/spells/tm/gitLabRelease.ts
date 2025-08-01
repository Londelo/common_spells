// create new function call release

//check to see if we have glab installed glab --version
//if not then tell the user to run brew install glab

//check to see if we are logged in with glab auth status
// if not then tell the user to run glab auth login --hostname git.tmaws.io --token [access token]

//get the latest release version with glab release view

//get the default branch useing the selectDefaultBranch in src/shared/selectors

// execute git shortlog --no-merges [latestRelease]..[defaultBranch]
// store this output in a variable called releaseNotes

// execute glab release create [latestVersion] --notes "```\n[releaseNotes]\n```"
