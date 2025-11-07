# Contributing to TuneWell

Thank you for your interest in contributing to TuneWell! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Device/OS information
   - Screenshots if applicable

### Suggesting Features

1. Check if the feature has been suggested
2. Create an issue with:
   - Clear description of the feature
   - Use cases
   - Potential implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following code style guidelines
4. Test thoroughly on both iOS and Android
5. Update documentation if needed
6. Commit with clear messages
7. Push to your fork
8. Create a Pull Request with:
   - Description of changes
   - Related issue numbers
   - Testing performed

## Development Setup

See README.md for development environment setup.

## Code Style

- Follow TypeScript best practices
- Use ESLint configuration provided
- Format code with Prettier
- Write meaningful variable and function names
- Comment complex logic
- Keep functions small and focused

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add DSD file support
fix: resolve playback crash on Android 13
docs: update installation instructions
refactor: improve EQ performance
```

Prefixes:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

## Testing

- Test on both iOS and Android
- Test different audio formats
- Test with external DACs if available
- Verify UI on different screen sizes
- Check for memory leaks

## Version Updates

When making changes that warrant a version bump:

```bash
npm run version:update <new-version>
```

Follow semantic versioning:
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

## Questions?

Contact: SMohammady@outlook.com

Thank you for contributing to TuneWell!
