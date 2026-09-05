import valueParser, { Node } from 'postcss-value-parser'

const IMAGE_SET = new Set(['image-set', '-webkit-image-set'])

// Computed `background-image` is a comma-separated stack of layers, and a layer
// can bury a url inside image-set() or cross-fade(). Everything here works on the
// computed value, which the browser has already resolved against the stylesheet's
// own base url, so the strings come out absolute.
export const backgroundImageUrls = (value: string): string[] => {
  if (value === '' || value === 'none') return []

  const urls = new Set<string>()
  const collect = (nodes: Node[], inImageSet: boolean): void => {
    for (const node of nodes) {
      if (node.type === 'function') {
        const name = node.value.toLowerCase()
        if (name === 'url') {
          const [argument] = node.nodes
          if (argument !== undefined && argument.value !== '') urls.add(argument.value)
          continue
        }

        collect(node.nodes, IMAGE_SET.has(name))
        continue
      }

      // image-set() also takes bare strings as candidates, and which one the
      // browser picked isn't observable. Its type() and resolution arguments are
      // not candidates.
      if (inImageSet && node.type === 'string' && node.value !== '') urls.add(node.value)
    }
  }

  collect(valueParser(value).nodes, false)

  return [...urls]
}
