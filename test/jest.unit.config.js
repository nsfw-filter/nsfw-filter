module.exports = {
    testMatch: [ "**/test/unit/**/*.[jt]s?(x)" ],
    verbose: true,
    testTimeout: 10000,
    maxConcurrency: 1,
    maxWorkers: 1,
    preset: 'ts-jest',
    testEnvironment: 'node'
}
