module.exports = {
    testMatch: [
      "**/test/**/*.test.js"
    ],
    verbose: true,
    testTimeout: 100000,
    maxConcurrency: 1,
    maxWorkers: 1,
    preset: 'jest-puppeteer',
    setupFilesAfterEnv: ['./jest.setup.js'],
}
