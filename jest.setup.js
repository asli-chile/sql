// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage con implementación completa y funciones mockeadas
let localStorageStore = {};

const localStorageMock = {
  getItem: jest.fn((key) => {
    return localStorageStore[key] || null;
  }),
  setItem: jest.fn((key, value) => {
    localStorageStore[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete localStorageStore[key];
  }),
  clear: jest.fn(() => {
    localStorageStore = {};
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: jest.fn((index) => {
    const keys = Object.keys(localStorageStore);
    return keys[index] || null;
  }),
};

// Limpiar store antes de cada test
beforeEach(() => {
  localStorageStore = {};
  jest.clearAllMocks();
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

