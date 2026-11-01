import "@testing-library/jest-dom/vitest"

const memoriaStorage = new Map<string, string>()

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => memoriaStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoriaStorage.set(key, String(value))
    },
    removeItem: (key: string) => {
      memoriaStorage.delete(key)
    },
    clear: () => {
      memoriaStorage.clear()
    },
    get length() {
      return memoriaStorage.size
    },
    key: (index: number) => Array.from(memoriaStorage.keys())[index] ?? null,
  },
  configurable: true,
  writable: true,
})
