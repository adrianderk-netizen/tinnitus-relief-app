# 🚀 Quick Start - Testing & CI/CD

## Installation (One-Time Setup)

1. **Install Node.js** (if not already installed)
   - Download: https://nodejs.org/
   - Version: 20.x LTS recommended

2. **Install Dependencies**
   ```bash
   npm install
   ```

## Running Tests

```bash
# Quick test run
npm test

# With coverage
npm run test:coverage

# Watch mode (auto-rerun)
npm run test:watch

# UI dashboard
npm run test:ui
```

## What Gets Tested?

- ✅ **Audio Engine** - Tone generation, oscillators, filters
- ✅ **Session Manager** - Timers, statistics, data persistence  
- ✅ **Subscription Manager** - Feature gating, trial management
- ⏳ **UI Components** - Coming soon
- ⏳ **Integration Tests** - Coming soon

## CI/CD Pipeline

### Automatic on Git Push

**Dev Branch:**
- Tests run automatically
- Deploys to Netlify if tests pass

**main Branch:**
- Full test suite
- Deploys to production
- Creates release

### Manual Workflow

```bash
# 1. Make changes
git add .
git commit -m "feat: add new feature"

# 2. Tests run automatically on GitHub
# 3. Check Actions tab for results
# 4. Merge when green ✅
```

## Test Coverage Goals

| Module               | Target | Status |
|---------------------|--------|---------|
| Audio Engine        | 70%    | ✅ Ready |
| Session Manager     | 70%    | ✅ Ready |
| Subscription        | 70%    | ✅ Ready |
| UI Components       | 60%    | ⏳ TODO  |

## File Structure

```
tinnitus-relief-app/
├── tests/              # Test files
│   ├── setup.js        # Global mocks & helpers
│   ├── *.test.js       # Unit tests
├── .github/
│   └── workflows/
│       └── ci-cd.yml   # Automated pipeline
├── vitest.config.js    # Test configuration
└── package.json        # Test scripts
```

## Quick Reference

| Command                | Purpose                  |
|-----------------------|--------------------------|
| `npm test`            | Run tests once           |
| `npm run test:watch`  | Watch mode               |
| `npm run test:ui`     | Visual dashboard         |
| `npm run test:coverage` | Generate coverage      |

## Troubleshooting

**Tests won't run?**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

**Coverage not generating?**
```bash
# Clean and regenerate
rm -rf coverage
npm run test:coverage
```

## Documentation

- 📖 **Full Guide**: [TESTING-GUIDE.md](../TESTING-GUIDE.md)
- 🔧 **Config**: [vitest.config.js](../vitest.config.js)
- 🎯 **CI/CD**: [ci-cd.yml](workflows/ci-cd.yml)

---

**Status**: ✅ Configured & Ready  
**Last Updated**: Feb 6, 2026
