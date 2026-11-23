const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup/test-setup.js'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'app.js',
        'config/**/*.js',
        'controllers/**/*.js',
        'middlewares/**/*.js',
        'models/**/*.js',
        'routes/**/*.js',
        'services/**/*.js',
        'utils/**/*.js',
      ],
      exclude: ['node_modules/**', 'tests/**', 'scripts/**', 'tugas/**', 'coverage/**'],
    },
  },
});
