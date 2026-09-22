export type MediaRoot = Document | ShadowRoot

export const shadowRootOf = (element: Element): ShadowRoot | null => {
  if (element.shadowRoot !== null) return element.shadowRoot
  if (!(element instanceof HTMLElement)) return null
  if (typeof chrome === 'undefined') return null
  return chrome.dom?.openOrClosedShadowRoot(element) ?? null
}

// Document selectors do not cross shadow boundaries. Use the same traversal for
// discovering media and for restoring it when filtering is turned off.
// Breadth-first, and the list grows as it is walked: shadow trees nest, so a
// root found here is searched in its turn.
export const mediaRoots = (root: ParentNode = document): ParentNode[] => {
  const roots = [root]
  for (let index = 0; index < roots.length; index++) {
    const current = roots[index]
    const elements = [...current.querySelectorAll('*')]
    if (current instanceof Element) elements.unshift(current)
    for (const element of elements) {
      const shadow = shadowRootOf(element)
      if (shadow !== null) roots.push(shadow)
    }
  }
  return roots
}

export const mediaElements = <T extends Element>(selector: string): T[] =>
  mediaRoots().flatMap(root => [...root.querySelectorAll<T>(selector)])
