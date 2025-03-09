# Specialist Monorepo

This is a monorepo containing AI agent frameworks and applications.

## Package Structure

- `@specialist/core` - Core framework for writing AI agents
- `@specialist/penguin` - Example application using the core framework

## Development

This repository is managed with pnpm workspaces.

### Setup

```bash
pnpm install
```

### Build all packages

```bash
pnpm build
```

### Run tests for all packages

```bash
pnpm test
```

### Running specific packages

To run the specialist package:

```bash
pnpm specialist
# or
pnpm dev:specialist
```

To run the penguin package:

```bash
pnpm penguin
# or
pnpm dev:penguin
```

### Running the root CLI

The root CLI provides access to both packages:

```bash
pnpm dev
# or to run a specific subcommand
pnpm dev -- specialist
pnpm dev -- penguin
```

## Package Dependencies

- `@specialist/core` - The core library with no dependencies on other packages
- `@specialist/penguin` - Depends on `@specialist/core`
