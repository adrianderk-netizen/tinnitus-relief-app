import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use happy-dom for faster DOM simulation
    environment: 'happy-dom',
    
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['js/**/*.js'],
      exclude: [
        'js/**/*.test.js',
        'js/**/*.spec.js',
        'node_modules/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    },
    
    // Test settings
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Setup file for global test utilities
    setupFiles: ['./tests/setup.js'],
    
    // Include test files
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    
    // Exclude patterns
    exclude: ['node_modules/**', 'dist/**'],
    
    // Watch settings
    watchExclude: ['node_modules/**', 'dist/**']
  }
});
