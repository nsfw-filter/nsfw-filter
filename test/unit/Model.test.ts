import { Model } from '../../src/background/Model'

describe.only('background => Model => handleFilterStrictness', () => {
    const data = [
        { value: 1, expected: 0.98 },
        { value: 100, expected: 0.4 },
        { value: 30, expected: 0.806 },
        { value: 70, expected: 0.574 },
        { value: 50, expected: 0.69 },
    ]

    test.each(data)(`Handle model filter strictness correctly %s`, (_data) => {
        const minValue = 40
        const maxValue = 98
        const { value, expected } = _data
        expect(Model.handleFilterStrictness({ value, minValue, maxValue })).toBe(expected)
    })
})
