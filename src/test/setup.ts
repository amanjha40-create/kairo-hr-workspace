import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

if (!window.localStorage) {
  Object.defineProperty(window, "localStorage", { value: memoryStorage(), configurable: true });
}
if (!window.sessionStorage) {
  Object.defineProperty(window, "sessionStorage", { value: memoryStorage(), configurable: true });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});
