module.exports = {
    testMatch: [ "**/test/e2e/**/*.[jt]s?(x)" ],
    verbose: true,
    rootDir: ".",
    testTimeout: 100000,
    maxConcurrency: 1,
    maxWorkers: 1,
    setupFilesAfterEnv: ['./jest.e2e.setup.js'],
    globalSetup: './jest.e2e.global_setup.js',
    globalTeardown: './jest.e2e.global_teardown.js',
    testEnvironment: './puppeteer_environment.js',
}
