import { backgroundImageUrls } from '../../src/content/Filter/backgroundImageValue'

describe('content => backgroundImageValue', () => {
  test('reads the url out of a single layer', () => {
    expect(backgroundImageUrls('url("http://example.com/a.jpg")')).toEqual(['http://example.com/a.jpg'])
  })

  test('reads every layer of a stack', () => {
    const value = 'url("http://example.com/a.jpg"), url("http://example.com/b.jpg")'
    expect(backgroundImageUrls(value)).toEqual(['http://example.com/a.jpg', 'http://example.com/b.jpg'])
  })

  test('ignores gradients', () => {
    expect(backgroundImageUrls('linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))')).toEqual([])
    expect(backgroundImageUrls('none')).toEqual([])
    expect(backgroundImageUrls('')).toEqual([])
  })

  test('finds a url a gradient layer is stacked over', () => {
    const value = 'linear-gradient(transparent, transparent), url("http://example.com/a.jpg")'
    expect(backgroundImageUrls(value)).toEqual(['http://example.com/a.jpg'])
  })

  // Which candidate the browser picked isn't observable from here.
  test('takes every candidate of an image-set', () => {
    const value = 'image-set(url("http://example.com/1x.jpg") 1x, "http://example.com/2x.jpg" 2x)'
    expect(backgroundImageUrls(value)).toEqual(['http://example.com/1x.jpg', 'http://example.com/2x.jpg'])
  })

  test('deduplicates a url used by more than one layer', () => {
    const value = 'url("http://example.com/a.jpg"), url("http://example.com/a.jpg")'
    expect(backgroundImageUrls(value)).toEqual(['http://example.com/a.jpg'])
  })
})

// image-set() carries more than candidates: a type() hint is not something to
// send to the model.
describe('content => backgroundImageValue => image-set arguments', () => {
  test('skips the type hint of an image-set candidate', () => {
    const value = 'image-set(url("http://example.com/a.avif") type("image/avif") 1x)'
    expect(backgroundImageUrls(value)).toEqual(['http://example.com/a.avif'])
  })

  test('skips a quoted gradient argument that is not a candidate', () => {
    const value = 'cross-fade(url("http://example.com/a.jpg"), "not-a-candidate")'
    expect(backgroundImageUrls(value)).toEqual(['http://example.com/a.jpg'])
  })
})
