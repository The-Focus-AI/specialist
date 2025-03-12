import { generateText } from "ai";
import { trackUsage } from "../usage.js";
import { modelFromString } from "../models.js";
import { MemoryItem, MemoryOperationResult } from "../memory.js";

// Memory operation prompt
const MEMORY_OPERATION_PROMPT = `You are a smart memory manager which controls the memory of a system.
You can perform four operations: (1) add into the memory, (2) update the memory, (3) delete from the memory, and (4) no change.

Based on the above four operations, the memory will change.

Compare newly retrieved facts with the existing memory. For each new fact, decide whether to:
- ADD: Add it to the memory as a new element
- UPDATE: Update an existing memory element
- DELETE: Delete an existing memory element
- NONE: Make no change (if the fact is already present or irrelevant)

There are specific guidelines to select which operation to perform:

1. **Add**: If the retrieved facts contain new information not present in the memory, then you have to add it by generating a new ID in the id field.
    - **Example**:
        - Old Memory:
            [
                {
                    "id" : "0",
                    "text" : "User is a software engineer"
                }
            ]
        - Retrieved facts: ["Name is John"]
        - New Memory:
            {
                "memory" : [
                    {
                        "id" : "0",
                        "text" : "User is a software engineer",
                        "event" : "NONE"
                    },
                    {
                        "id" : "1",
                        "text" : "Name is John",
                        "event" : "ADD"
                    }
                ]
            }

2. **Update**: If the retrieved facts contain information that is already present in the memory but the information is totally different, then you have to update it. 
    If the retrieved fact contains information that conveys the same thing as the elements present in the memory, then you have to keep the fact which has the most information. 
    Example (a) -- if the memory contains "User likes to play cricket" and the retrieved fact is "Loves to play cricket with friends", then update the memory with the retrieved facts.
    Example (b) -- if the memory contains "Likes cheese pizza" and the retrieved fact is "Loves cheese pizza", then you do not need to update it because they convey the same information.
    If the direction is to update the memory, then you have to update it.
    Please keep in mind while updating you have to keep the same ID.
    Please note to return the IDs in the output from the input IDs only and do not generate any new ID.
    - **Example**:
        - Old Memory:
            [
                {
                    "id" : "0",
                    "text" : "I really like cheese pizza"
                },
                {
                    "id" : "1",
                    "text" : "User is a software engineer"
                },
                {
                    "id" : "2",
                    "text" : "User likes to play cricket"
                }
            ]
        - Retrieved facts: ["Loves chicken pizza", "Loves to play cricket with friends"]
        - New Memory:
            {
            "memory" : [
                    {
                        "id" : "0",
                        "text" : "Loves cheese and chicken pizza",
                        "event" : "UPDATE",
                        "old_memory" : "I really like cheese pizza"
                    },
                    {
                        "id" : "1",
                        "text" : "User is a software engineer",
                        "event" : "NONE"
                    },
                    {
                        "id" : "2",
                        "text" : "Loves to play cricket with friends",
                        "event" : "UPDATE",
                        "old_memory" : "User likes to play cricket"
                    }
                ]
            }

3. **Delete**: If the retrieved facts contain information that contradicts the information present in the memory, then you have to delete it. Or if the direction is to delete the memory, then you have to delete it.
    Please note to return the IDs in the output from the input IDs only and do not generate any new ID.
    - **Example**:
        - Old Memory:
            [
                {
                    "id" : "0",
                    "text" : "Name is John"
                },
                {
                    "id" : "1",
                    "text" : "Loves cheese pizza"
                }
            ]
        - Retrieved facts: ["Dislikes cheese pizza"]
        - New Memory:
            {
            "memory" : [
                    {
                        "id" : "0",
                        "text" : "Name is John",
                        "event" : "NONE"
                    },
                    {
                        "id" : "1",
                        "text" : "Loves cheese pizza",
                        "event" : "DELETE"
                    }
            ]
            }

4. **No Change**: If the retrieved facts contain information that is already present in the memory, then you do not need to make any changes.
    - **Example**:
        - Old Memory:
            [
                {
                    "id" : "0",
                    "text" : "Name is John"
                },
                {
                    "id" : "1",
                    "text" : "Loves cheese pizza"
                }
            ]
        - Retrieved facts: ["Name is John"]
        - New Memory:
            {
            "memory" : [
                    {
                        "id" : "0",
                        "text" : "Name is John",
                        "event" : "NONE"
                    },
                    {
                        "id" : "1",
                        "text" : "Loves cheese pizza",
                        "event" : "NONE"
                    }
                ]
            }

Below is the current content of my memory which I have collected till now. You have to update it in the following format only:

\`\`
{retrieved_old_memory_dict}
\`\`

The new retrieved facts are mentioned in the triple backticks. You have to analyze the new retrieved facts and determine whether these facts should be added, updated, or deleted in the memory.

\`\`\`
{response_content}
\`\`\`

Follow the instruction mentioned below:
- Do not return anything from the custom few shot prompts provided above.
- If the current memory is empty, then you have to add the new retrieved facts to the memory.
- You should return the updated memory in only JSON format as shown below. The memory key should be the same if no changes are made.
- If there is an addition, generate a new key and add the new memory corresponding to it.
- If there is a deletion, the memory key-value pair should be removed from the memory.
- If there is an update, the ID key should remain the same and only the value needs to be updated.

Do not return anything except the JSON format.`;

export interface OperationDeterminationConfig {
  llm_model: string;
}

/**
 * Specialist for determining memory operations based on facts and existing memories
 */
export class DetermineOperationsSpecialist {
  private config: OperationDeterminationConfig;

  /**
   * Create a new operation determination specialist
   * @param config The LLM configuration
   */
  constructor(config: OperationDeterminationConfig) {
    this.config = config;
  }

  /**
   * Format existing memories for LLM input
   * @param memories Array of memory items
   * @returns Formatted memories for LLM prompt
   */
  private formatMemoriesForPrompt(
    memories: MemoryItem[]
  ): Array<{ id: string; text: string }> {
    return memories.map((memory, index) => {
      return {
        id: String(index),
        text: memory.memory,
      };
    });
  }

  /**
   * Create a mapping from numeric IDs to actual UUIDs
   * @param memories Array of memory items
   * @returns Map of numeric IDs to UUIDs
   */
  private createIdMapping(memories: MemoryItem[]): Map<string, string> {
    const mapping = new Map<string, string>();
    memories.forEach((memory, index) => {
      mapping.set(String(index), memory.id);
    });
    return mapping;
  }

  /**
   * Determine memory operations based on extracted facts and existing memories
   * @param facts The extracted facts
   * @param existingMemories Optional existing memories to consider
   * @returns Memory operation result
   */
  public async determineOperations(
    facts: string[],
    existingMemories: MemoryItem[] = []
  ): Promise<MemoryOperationResult> {
    try {
      const startTime = Date.now();

      // If no facts, return empty result
      if (!facts.length) {
        return { results: [] };
      }

      // Format existing memories for the operation prompt
      const formattedMemories = this.formatMemoriesForPrompt(existingMemories);

      // Create a mapping from numeric IDs to actual UUIDs
      const idMapping = this.createIdMapping(existingMemories);

      // Format the prompts
      const oldMemoryDict = JSON.stringify(formattedMemories, null, 2);
      const factsContent = JSON.stringify(facts, null, 2);

      const memoryPrompt = MEMORY_OPERATION_PROMPT.replace(
        "{retrieved_old_memory_dict}",
        oldMemoryDict
      ).replace("{response_content}", factsContent);

      // Call LLM to determine operations
      const result = await generateText({
        model: modelFromString(this.config.llm_model),
        messages: [{ role: "system", content: memoryPrompt }],
      });

      // Track usage
      const duration = Date.now() - startTime;
      await trackUsage({
        timestamp: new Date().toISOString(),
        model: this.config.llm_model,
        operation: "memory-determine-ops",
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        totalTokens: result.usage?.totalTokens,
        duration,
      });

      // Extract JSON from potential markdown response and parse it
      try {
        // Helper function to extract JSON from markdown code blocks
        const extractJsonFromText = (text: string): string => {
          // Check for markdown code blocks
          const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            return jsonBlockMatch[1].trim();
          }

          // If no markdown block found, return the text as is
          return text.trim();
        };

        const jsonText = extractJsonFromText(result.text);
        const parsedContent = JSON.parse(jsonText);

        // Check if the response has the expected memory array format
        if (parsedContent.memory) {
          // Standard format with memory array
          const formattedResults = parsedContent.memory.map((item: any) => {
            const originalId = idMapping.get(item.id);

            return {
              id: originalId || crypto.randomUUID(), // Generate new ID for ADD operations
              memory: item.text,
              event: item.event,
              previous_memory: item.old_memory,
            };
          });
          return { results: formattedResults };
        } else if (Array.isArray(parsedContent)) {
          // Alternative format: direct array of items
          const formattedResults = parsedContent.map((item: any) => {
            const originalId = idMapping.get(item.id);

            return {
              id: originalId || crypto.randomUUID(), // Generate new ID for ADD operations
              memory: item.text,
              event: item.event,
              previous_memory: item.old_memory,
            };
          });
          return { results: formattedResults };
        } else {
          // Unknown format, use fallback
          throw new Error("Unexpected response format");
        }
      } catch (e) {
        console.error("Error parsing LLM JSON response:", e);
        console.error("Response text:", result.text);

        // Fallback: Add all facts as new memories
        return {
          results: facts.map((fact) => ({
            id: crypto.randomUUID(),
            memory: fact,
            event: "ADD",
          })),
        };
      }
    } catch (error) {
      console.error("Error determining operations:", error);
      return { results: [] };
    }
  }
}
