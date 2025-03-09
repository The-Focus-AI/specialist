#!/usr/bin/env node
import { run } from "cmd-ts";
import { command, subcommands } from "cmd-ts";

// Import both CLIs
const app = subcommands({
  name: "specialist-monorepo",
  cmds: {
    specialist: command({
      name: "specialist",
      description: "Run specialist commands",
      args: {},
      handler: async () => {
        console.log("To run specialist directly, use: pnpm --filter @specialist/core dev");
      },
    }),
    penguin: command({
      name: "penguin",
      description: "Run penguin commands",
      args: {},
      handler: async () => {
        console.log("To run penguin directly, use: pnpm --filter @specialist/penguin dev");
      },
    }),
  },
});

async function main() {
  try {
    await run(app, process.argv.slice(2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
