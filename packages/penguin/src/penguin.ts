import { Prompt } from "@specialist/core/ai/context";
import { modelFromString } from "@specialist/core/ai/models";

import { tool as createTool } from "ai";
import { z } from "zod";

export interface PenguinNamesArgs {
  count: string;
}

export const penguinNames = createTool({
  description: "Get a list of all penguin names",
  parameters: z.object({
    count: z.string().describe("The number of names to return as integer"),
  }),
  execute: async ({ count }: PenguinNamesArgs) => {
    console.log("penguinNames", count);
    const result = [];

    for (let i = 0; i < parseInt(count); i++) {
      result.push(`Penguin ${i}!!`);
    }

    return result;
  },
});

export async function penguinPrompt(): Promise<Prompt> {
  return {
    name: "penguin",
    system: "You are a penguin expert",
    model: modelFromString("ollama/llama3.2"),
    prepopulated_questions: [],
    tools: { penguinNames },
  };
}
