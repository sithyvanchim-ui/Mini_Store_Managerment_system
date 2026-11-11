import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom does not implement a number of browser APIs that Radix primitives and
// chart/layout components touch during render. Stub them once for the suite.
const noop = () => undefined;

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  class ResizeObserverMock {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
    takeRecords = () => [];
  }

  class IntersectionObserverMock {
    root = null;
    rootMargin = "";
    thresholds = [];
    observe = noop;
    unobserve = noop;
    disconnect = noop;
    takeRecords = () => [];
  }

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });

  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  });

  Object.defineProperty(window, "print", {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });

  Object.defineProperty(window, "scrollTo", {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });

  // Radix Select/Sheet call scrollIntoView, which jsdom does not implement.
  if (typeof Element !== "undefined") {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // Some Radix primitives probe pointer capture support.
  if (typeof HTMLElement !== "undefined") {
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.setPointerCapture = vi.fn();
  }
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
