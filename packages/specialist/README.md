# @specialist/core

Core AI agent framework for building specialized AI applications.

## Features

- Model abstractions for different AI providers
- Context handling
- Chat and completion APIs
- Tool integration

## Usage

```typescript
import { modelFromString, makeContext, complete } from '@specialist/core';

// Create your AI context
const context = makeContext({
  system: "You are a helpful assistant",
  model: modelFromString("openai/gpt-4o"),
});

// Run completions
const result = await complete(context, "What can you help me with today?");
console.log(result.text);
```

## API Documentation

### ai/models

Model abstractions for different AI providers.

### ai/context

Context handling for AI interactions.

### ai/chat

Chat-based API for conversational AI.

### ai/complete

Completion-based API for single-response AI.