declare module '@specialist/core/ai/chat' {
  // Add minimal type definitions as needed
}

declare module '@specialist/core/ai/models' {
  export function modelFromString(model: string): any;
}

declare module '@specialist/core/ai/complete' {
  export function complete(context: any, query?: string): Promise<any>;
  export function toolCallsFromResult(toolName: string, result: any): any[];
}

declare module '@specialist/core/ai/context' {
  export interface Prompt {
    name: string;
    system: string;
    prepopulated_questions: string[];
    tools: any;
    model: any;
  }
  
  export interface Context {
    prompt: Prompt;
    messages: any[];
  }
  
  export function makeContext(prompt: Prompt, model?: string): Context;
}