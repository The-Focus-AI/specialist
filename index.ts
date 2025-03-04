import { run } from "cmd-ts";
import { app } from "@/specialist/cli.js";

async function main() {
  await run(app, process.argv.slice(2));
}

main()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch(console.error);
