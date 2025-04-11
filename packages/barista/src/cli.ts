import { Context } from "@specialist/core/ai/context";
import { baristaPrompt } from "./barista.js";
import childProcess from "child_process";
import { modelStringFromModel } from "@specialist/core/ai/models";
import { interactiveChat } from "@specialist/core/ai/chat";

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    const cmd = 'op read "op://Development/OpenAI Key/notesPlain"';
    process.env.OPENAI_API_KEY = await childProcess
      .execSync(cmd)
      .toString()
      .trim();
  }

  const runningPrompt = await baristaPrompt();
  const context = new Context(runningPrompt);
  console.log("[Model]", modelStringFromModel(runningPrompt.model));
  console.log("[Prompt]", runningPrompt.system);
  const result = await interactiveChat(context);
  console.log(result);
}

run()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch(console.error);
