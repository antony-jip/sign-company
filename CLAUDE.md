# CLAUDE.md - AI Assistant Guide for sign-company

This document provides essential context for AI assistants working with this codebase.

## Project Overview

**Repository:** sign-company
**Status:** New project - initial setup in progress
**Last Updated:** 2025-12-05

<!-- TODO: Add project description once defined -->
<!-- Example: This is a [web app/CLI tool/library] that [primary purpose] -->

## Repository Structure

```
sign-company/
├── CLAUDE.md          # This file - AI assistant guide
└── (project structure to be defined)
```

<!-- Update this section as the project structure develops -->

## Development Setup

### Prerequisites

<!-- TODO: List required tools and versions -->
<!-- Example:
- Node.js >= 18.x
- npm or yarn
- Docker (optional)
-->

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sign-company

# Install dependencies (update based on actual package manager)
# npm install
# yarn install
# pip install -r requirements.txt
```

### Running the Project

<!-- TODO: Add run commands once project is set up -->
```bash
# Development server
# npm run dev

# Build for production
# npm run build

# Run tests
# npm test
```

## Key Commands

| Command | Description |
|---------|-------------|
| `git status` | Check current changes |
| `git push -u origin <branch>` | Push changes to remote |

<!-- TODO: Add project-specific commands as they are established -->

## Code Conventions

### General Guidelines

- Write clear, self-documenting code
- Follow consistent naming conventions
- Keep functions focused and small
- Add comments only where logic isn't self-evident

### Git Workflow

- Branch naming: `feature/<description>`, `fix/<description>`, `claude/<session-id>`
- Write descriptive commit messages explaining "why" not "what"
- Keep commits atomic and focused

### File Organization

<!-- TODO: Define conventions as the project structure emerges -->
<!-- Example:
- Source code in `src/`
- Tests alongside source files as `*.test.ts` or in `__tests__/`
- Configuration files in project root
-->

## Testing

<!-- TODO: Add testing framework and conventions once established -->
<!-- Example:
- Framework: Jest/Pytest/Go test
- Run all tests: `npm test`
- Run specific test: `npm test -- <pattern>`
- Coverage threshold: 80%
-->

## Architecture Notes

<!-- TODO: Document key architectural decisions -->
<!-- Example:
- Component-based architecture
- State management: Redux/Zustand/Context
- API layer: REST/GraphQL
-->

## Common Tasks for AI Assistants

### When Making Changes

1. Read relevant files before modifying
2. Understand existing patterns in the codebase
3. Run tests after changes if test suite exists
4. Keep changes minimal and focused on the task

### When Adding Features

1. Follow existing code patterns
2. Add appropriate tests
3. Update documentation if needed
4. Consider backwards compatibility

### When Fixing Bugs

1. Understand the root cause before fixing
2. Add a test that reproduces the bug
3. Fix with minimal changes
4. Verify the fix doesn't introduce regressions

## Environment Variables

<!-- TODO: Document required environment variables -->
<!-- Example:
| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | External API key | Yes |
| `DEBUG` | Enable debug mode | No |
-->

## External Dependencies

<!-- TODO: List and explain key dependencies -->

## Troubleshooting

<!-- TODO: Add common issues and solutions -->
<!-- Example:
### Issue: Build fails with X error
**Solution:** Run `npm clean-install` to refresh dependencies
-->

## Additional Resources

<!-- TODO: Add relevant links -->
<!-- Example:
- [Project Documentation](link)
- [API Reference](link)
- [Design Documents](link)
-->

---

## Maintenance Notes

This CLAUDE.md should be updated when:
- New major features are added
- Development workflow changes
- New conventions are established
- Dependencies significantly change
- Architecture evolves

Keep this document concise but comprehensive - it should give an AI assistant everything needed to work effectively with this codebase.
