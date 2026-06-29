module.exports = {
    testMatch: [ "**/test/unit/**/*.[jt]s?(x)" ],
    verbose: true,
    testTimeout: 100000,
    maxConcurrency: 1,
    maxWorkers: 1,
    transform: {
        "^.+\\.[jt]sx?$": [ "ts-jest", { tsconfig: "test/tsconfig.json" } ]
    },
    testEnvironment: "node"
}
