import { run, subcommands } from "cmd-ts";
import { completeCommand } from "./commands/complete.js";
import { chatCommand } from "./commands/chat.js";
import { usageCommand } from "./commands/usage.js";

export const app = subcommands({
  name: "app",
  cmds: {
    complete: completeCommand,
    chat: chatCommand,
    usage: usageCommand,
  },
});

console.log(process.argv.slice(2));

run(app, process.argv.slice(2));
