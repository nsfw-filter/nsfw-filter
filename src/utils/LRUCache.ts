export class LRUCache {
  private readonly MAX: number
  private readonly cache: Map<string, boolean>

  constructor (_MAX: number) {
    if (typeof _MAX !== 'number') throw new Error('Please set cache max size')

    this.MAX = _MAX
    this.cache = new Map()
  }

  public get (key: string): boolean | undefined {
    const item = this.cache.get(key)

    if (typeof item === 'boolean') {
      this.cache.delete(key)
      this.cache.set(key, item)
    }

    return item
  }

  public has (key: string): boolean {
    return this.cache.has(key)
  }

  public set (key: string, val: boolean): void {
    if (this.cache.has(key)) this.cache.delete(key)
    else if (this.cache.size === this.MAX) this.cache.delete(this.first())
    this.cache.set(key, val)
  }

  private first (): string {
    return this.cache.keys().next().value
  }
}
