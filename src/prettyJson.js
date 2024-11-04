function prettyJson(string) {
  const niceLookingJson = JSON.stringify(string, null, '\t');

  console.clear()
  console.log("\n SO PRETTY \n",niceLookingJson);
}

prettyJson(process.argv[2])
