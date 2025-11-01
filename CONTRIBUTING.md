# Contributing to utileejs

Thank you for your interest in contributing to utileejs! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- make (for build automation)

### Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/telnet2/utileejs.git
cd utileejs
```

2. Install dependencies:
```bash
make install
# or
npm install
```

3. Verify your setup:
```bash
make verify
```

4. Build the project:
```bash
make build
```

5. Run tests to ensure everything works:
```bash
make test
```

## Development Workflow

### Making Changes

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

2. Make your changes in the `src/` directory (TypeScript files)

3. Build and test frequently:
```bash
# Quick build and test
make quick

# Or use watch mode for continuous building
make watch
```

4. Run type checking:
```bash
make check
```

### Writing Code

- **Language**: Write all source code in TypeScript in the `src/` directory
- **Style**: Follow existing code style and conventions
- **Types**: Add proper type annotations
- **Comments**: Add JSDoc comments for public APIs
- **Tests**: Write tests for new features or bug fixes

### Project Structure

```
utileejs/
├── src/              # TypeScript source files (edit these)
│   ├── MemFS.ts      # In-memory file system
│   ├── MemShell.ts   # Shell command implementation
│   ├── MemREPL.ts    # REPL interface
│   ├── MemTools.ts   # LLM tool interface
│   └── ...
├── test/             # Test files (add tests here)
│   ├── *.test.js     # Mocha unit tests
│   └── test_*.js     # Integration tests
├── lib/              # Compiled output (auto-generated, don't edit)
├── examples/         # Example usage files
└── bin/              # CLI executables
```

### Running Tests

```bash
# Run all tests
make test

# Run only unit tests
make test-unit

# Run tests in watch mode
make test-watch

# Run tests with coverage
make test-coverage
```

### Adding Tests

1. For unit tests, create files in `test/` with the pattern `*.test.js`
2. For integration tests, create files with the pattern `test_*.js`
3. Use Mocha and Chai for testing:

```javascript
const { expect } = require('chai');
const { MemFS } = require('../lib/MemFS');

describe('MemFS', () => {
    it('should create a file', () => {
        const fs = new MemFS();
        fs.createFile('test.txt', 'content');
        expect(fs.exists('test.txt')).to.be.true;
    });
});
```

## Code Quality

### Type Checking

Always run type checking before committing:

```bash
make check
```

### Linting (Optional)

If ESLint is configured:

```bash
make lint
```

### Formatting (Optional)

If Prettier is configured:

```bash
make format
```

## Commit Guidelines

### Commit Messages

Follow conventional commit format:

```
type(scope): brief description

Longer description if needed

Fixes #issue-number
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```
feat(memfs): add support for symbolic links
fix(shell): handle empty command arguments correctly
docs(readme): update installation instructions
test(memshell): add tests for pipe operations
```

### Commit Checklist

Before committing:
- [ ] Code builds successfully (`make build`)
- [ ] All tests pass (`make test`)
- [ ] Type checking passes (`make check`)
- [ ] Code is properly formatted
- [ ] New features have tests
- [ ] Documentation is updated if needed

## Pull Request Process

1. **Update your branch** with the latest changes from main:
```bash
git fetch origin
git rebase origin/master
```

2. **Ensure all checks pass**:
```bash
make ci
```

3. **Create a pull request** with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference to any related issues
   - Screenshots/examples if applicable

4. **Pull Request Checklist**:
   - [ ] Code follows project style
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] All tests pass
   - [ ] Type checking passes
   - [ ] No TypeScript errors
   - [ ] Commit messages follow guidelines

## Release Process

For maintainers:

```bash
# Bump version
make version-patch  # 0.0.x
make version-minor  # 0.x.0
make version-major  # x.0.0

# Prepare for publishing
make prepublish

# Publish to npm
make publish
```

## Useful Make Commands

Quick reference for common tasks:

```bash
make help           # Show all available commands
make info           # Show project statistics
make verify         # Verify project setup
make build          # Build TypeScript
make test           # Run tests
make quick          # Quick build and test
make watch          # Watch for changes
make clean          # Clean build artifacts
make all            # Full build pipeline
make ci             # CI/CD pipeline
```

## Getting Help

- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact Joohwi Lee <telnet2@gmail.com>

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the EPL-2.0 License.

## Questions?

Feel free to open an issue or reach out if you have any questions!
