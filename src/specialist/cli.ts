import { subcommands } from "cmd-ts";
import { completeCommand } from "./commands/complete.js";
import { chatCommand } from "./commands/chat.js";

export const app = subcommands({
  name: "app",
  cmds: { complete: completeCommand, chat: chatCommand },
});
