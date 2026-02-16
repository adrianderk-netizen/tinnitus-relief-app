# 🧪 Testing & CI/CD Guide

Complete guide for automated testing, version control, and continuous deployment.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Writing Tests](#writing-tests)
7. [Best Practices](#best-practices)

---

## 🔧 Prerequisites

### Install Node.js

**Windows:**
1. Download from https://nodejs.org/ (LTS version recommended)
2. Run installer (`node-v20.x.x-x64.msi`)
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

**Alternative (using Chocolatey):**
```bash
choco install nodejs-lts
```

---

## 📦 Installation

Once Node.js is installed:

```bash
# Navigate to project directory
cd c:\Users\carlo\Documents\Vibe-Projects\tinnitus-relief-app

# Install dependencies
npm install

# Verify test setup
npm test -- --version
```

---

## 🚀 Running Tests

### Quick Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with UI dashboard
npm run test:ui

# Run tests and generate coverage report
npm run test:coverage

# Run specific test file
npm test tests/audio-engine.test.js
```

### Test Output

```
✓ tests/audio-engine.test.js (25 tests) 145ms
✓ tests/session-manager.test.js (18 tests) 89ms
✓ tests/subscription-manager.test.js (22 tests) 112ms

Test Files  3 passed (3)
Tests      65 passed (65)
Duration   346ms
```

---

## 📊 Test Coverage

### View Coverage Report

```bash
# Generate coverage
npm run test:coverage

# Open HTML report
start coverage/index.html
```

### Coverage Targets

| Metric      | Target | Current |
|-------------|--------|---------|
| Lines       | 70%    | TBD     |
| Functions   | 70%    | TBD     |
| Branches    | 60%    | TBD     |
| Statements  | 70%    | TBD     |

### Coverage by Module

- **Audio Engine**: Core tone generation and audio processing
- **Session Manager**: Timer, statistics, persistence
- **Subscription Manager**: Feature gating, trial management
- **UI Components**: Tone matcher, visualizers, modals

---

## 🔄 CI/CD Pipeline

### Automated Workflows

The GitHub Actions pipeline runs automatically on:

#### 1. **Push to Dev Branch**
- ✅ Run all unit tests
- ✅ Generate coverage report
- ✅ Code quality checks
- ✅ Deploy to Netlify Dev environment

#### 2. **Pull Request to main**
- ✅ Run all unit tests
- ✅ Integration tests
- ✅ Coverage report comment on PR
- ✅ Code quality checks
- ❌ Block merge if tests fail

#### 3. **Push to main Branch**
- ✅ Full test suite
- ✅ Deploy to Netlify Production
- ✅ Create GitHub release (if tagged)
- ✅ Update CHANGELOG

### Viewing Pipeline Status

**GitHub:**
1. Go to repository
2. Click "Actions" tab
3. View workflow runs

**Status Badge:**
```markdown
![CI/CD](https://github.com/adrianderk-netizen/tinnitus-relief-app/workflows/CI%2FCD%20Pipeline/badge.svg)
```

---

## ✍️ Writing Tests

### Test Structure

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('ModuleName', () => {
  let instance;

  beforeEach(() => {
    // Setup before each test
    instance = new ModuleName();
  });

  describe('FeatureGroup', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = instance.process(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Test Categories

#### 1. **Unit Tests** (tests/*.test.js)
Test individual functions and classes in isolation.

```javascript
it('should create oscillator with correct frequency', () => {
  const osc = audioContext.createOscillator();
  osc.frequency.value = 440;
  expect(osc.frequency.value).toBe(440);
});
```

#### 2. **Integration Tests** (Future)
Test interactions between multiple components.

```javascript
it('should complete full tone matching workflow', () => {
  // Start frequency sweep
  // User marks frequency
  // Verify frequency saved
  // Switch to notched noise
  // Verify frequency applied
});
```

#### 3. **E2E Tests** (Future - Playwright)
Test complete user journeys through the UI.

```javascript
test('complete therapy session', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="start-tone"]');
  await page.fill('#frequency', '4000');
  await page.click('[data-testid="mark-frequency"]');
  // ... continue workflow
});
```

### Mocking

**localStorage:**
```javascript
beforeEach(() => {
  localStorage.clear();
});
```

**AudioContext:**
```javascript
// Already mocked in tests/setup.js
const audioContext = new AudioContext();
```

**Timers:**
```javascript
beforeEach(() => {
  vi.useFakeTimers();
});

it('should update after 1 second', () => {
  startTimer();
  vi.advanceTimersByTime(1000);
  expect(elapsed).toBe(1000);
});
```

---

## 📚 Best Practices

### 1. **Test Naming**
```javascript
// ✅ Good - Clear and specific
it('should calculate trial days remaining correctly')

// ❌ Bad - Vague
it('test trial')
```

### 2. **One Assertion Per Test**
```javascript
// ✅ Good
it('should start session', () => {
  session.start();
  expect(session.isRunning).toBe(true);
});

it('should not be paused when starting', () => {
  session.start();
  expect(session.isPaused).toBe(false);
});

// ❌ Bad - Multiple unrelated assertions
it('should handle session', () => {
  session.start();
  expect(session.isRunning).toBe(true);
  expect(session.volume).toBe(0.5);
  expect(session.mode).toBe('tone');
});
```

### 3. **Arrange-Act-Assert Pattern**
```javascript
it('should format time correctly', () => {
  // Arrange
  const milliseconds = 90000;
  
  // Act
  const formatted = formatTime(milliseconds);
  
  // Assert
  expect(formatted).toBe('1:30');
});
```

### 4. **Test Edge Cases**
```javascript
describe('Edge Cases', () => {
  it('should handle frequency at minimum (100 Hz)', () => {
    setFrequency(100);
    expect(getFrequency()).toBe(100);
  });

  it('should handle frequency at maximum (15000 Hz)', () => {
    setFrequency(15000);
    expect(getFrequency()).toBe(15000);
  });

  it('should handle invalid frequency gracefully', () => {
    expect(() => setFrequency(-100)).toThrow();
  });
});
```

### 5. **Clean Up After Tests**
```javascript
afterEach(() => {
  // Stop audio
  audioEngine.stopAll();
  
  // Clear localStorage
  localStorage.clear();
  
  // Reset mocks
  vi.restoreAllMocks();
});
```

---

## 🎯 Coverage Goals

### Phase 1: Core Modules (70%+)
- ✅ Audio Engine
- ✅ Session Manager
- ✅ Subscription Manager

### Phase 2: UI Components (60%+)
- ⏳ Tone Matcher UI
- ⏳ Frequency Sweep
- ⏳ Visualizers

### Phase 3: Integration (50%+)
- ⏳ Mode switching
- ⏳ Profile management
- ⏳ Data persistence

---

## 🐛 Debugging Tests

### Run Single Test
```bash
npm test -- audio-engine
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

### Verbose Output
```bash
npm test -- --reporter=verbose
```

---

## 📈 Continuous Improvement

### Weekly Tasks
- [ ] Review test coverage report
- [ ] Add tests for new features
- [ ] Update tests for bug fixes
- [ ] Refactor slow tests

### Monthly Tasks
- [ ] Review and update test strategy
- [ ] Performance test optimization
- [ ] Update dependencies
- [ ] Security audit

---

## 🆘 Troubleshooting

### Tests Not Running

**Error:** `npm: command not found`
- **Solution:** Install Node.js

**Error:** `Cannot find module 'vitest'`
- **Solution:** Run `npm install`

### Tests Failing

**Check:**
1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear test cache: `npm test -- --clearCache`
3. Check Node version: `node --version` (should be 18+)

### Coverage Not Generating

```bash
# Clean coverage directory
rm -rf coverage

# Regenerate
npm run test:coverage
```

---

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: See `/Documents` folder
- **CI/CD Logs**: GitHub Actions tab

---

## 🎓 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Netlify Deploy](https://docs.netlify.com/)

---

**Last Updated:** February 6, 2026  
**Version:** 1.0.0
