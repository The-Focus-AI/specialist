import { chatWithPrompt } from "@/specialist/ai/chat.js";
import {
  modelFromString,
  modelStringFromModel,
} from "@/specialist/ai/models.js";
import { penguinPrompt } from "./penguin.js";
import childProcess from "child_process";
async function run() {
  if (!process.env.OPENAI_API_KEY) {
    const cmd = 'op read "op://Development/OpenAI Key/notesPlain"';
    process.env.OPENAI_API_KEY = await childProcess
      .execSync(cmd)
      .toString()
      .trim();
  }

  const runningPrompt = await penguinPrompt();
  runningPrompt.model = modelFromString("openai/gpt-4o");
  console.log("[Model]", modelStringFromModel(runningPrompt.model));
  console.log("[Prompt]", runningPrompt.system);
  const result = await chatWithPrompt(runningPrompt);
  console.log(result);
}

run()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch(console.error);
