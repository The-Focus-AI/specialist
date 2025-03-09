# Specialist Monorepo Guide

## Build Commands
- Build all packages: `pnpm build` or `mise run build`
- Run specialist: `pnpm specialist` or `pnpm dev:specialist`
- Run penguin: `pnpm penguin` or `pnpm dev:penguin`
- Clean build output: `mise run clean`

## Test Commands
- Run all tests: `mise run test` or `pnpm test`
- Run single test: `pnpm --filter @specialist/core test -- -t "test name"` (replace `core` with `penguin` as needed)
- Watch core tests: `mise run testwatch` or `pnpm --filter @specialist/core test:watch`
- Watch penguin tests: `mise run testwatch-penguin` or `pnpm --filter @specialist/penguin test:watch`

## Code Style Guidelines
- **Imports**: Use explicit `.js` extension in imports; package imports from `@specialist/core` use path mapping
- **Formatting**: ESM modules with TypeScript; use `type: "module"` in package.json
- **Types**: Always use TypeScript interfaces/types; use generics for tools and contexts
- **Error Handling**: Use try/catch for async operations; functions should return Promise types when async
- **Naming**: camelCase for variables/functions, PascalCase for interfaces/types/classes
- **Documentation**: JSDoc comments for exported functions and types
- **Module Structure**: Index files should re-export from component files
- **Dependencies**: Reference workspace packages with `workspace:*`