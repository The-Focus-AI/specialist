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

### Testing

#### Regular Tests

```bash
# Run all tests
pnpm test
# or
mise run test

# Run specific package tests
pnpm --filter @specialist/core test
pnpm --filter @specialist/penguin test
# or
mise run test-specialist
mise run test-penguin
```

#### API Tests

The project includes API integration tests that require an OpenAI API key. These tests are skipped by default and are located in files ending with `.api.test.ts`.

To run API tests:

```bash
# Set your API key
export OPENAI_API_KEY=your_api_key_here

# Run all tests including API tests
pnpm test:api
# or
mise run test-api
```

API test results are saved in `tests_output/` directory for reference and debugging. This is especially useful since API calls can be expensive and time-consuming, so you don't need to re-run tests to see the results.

For CI environments, leave the tests in skip mode by not setting the `RUN_API_TESTS` environment variable.

#### Test Logging

To save test output to a log file:

```bash
# Save regular test output to test-output.log
pnpm test:log
# or
mise run test-log

# Save API test output to test-api-output.log
pnpm test:api:log
# or
mise run test-api-log
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
