import { LRUCache } from '../../src/background/LRUCache'

describe('background => LRUCache', () => {
    const [key1, value1] = ['key1', 'value1']
    const [key2, value2] = ['key2', 'value2']
    const [key3, value3] = ['key3', 'value3']
    const [key4, value4] = ['key4', 'value4']

    test(`Should set cache max size`, () => {
        // @ts-expect-error
        expect(() => new LRUCache).toThrow('Please set cache max size')
    })

    test(`Operations like set, has and get should work correctly`, () => {
        const cache = new LRUCache<string, string>(200)

        expect(cache.has(key1)).toBe(false)
        expect(cache.get(key1)).toBe(undefined)

        cache.set(key1, value1)

        expect(cache.has(key1)).toBe(true)
        expect(cache.get(key1)).toBe(value1)
    })

    test(`Cache should work correctly`, () => {
        const cache = new LRUCache<string, string>(2)

        cache.set(key1, value1)
        cache.set(key2, value2)
        cache.set(key3, value3)

        expect(cache.has(key1)).toBe(false)
    })

    test(`Least recently used implementation should work correctly`, () => {
        const cache = new LRUCache<string, string>(3)

        cache.set(key1, value1)
        cache.set(key2, value2)
        cache.set(key1, value1)

        cache.set(key3, value3)
        cache.set(key4, value4)
        expect(cache.has(key2)).toBe(false)
    })
})
