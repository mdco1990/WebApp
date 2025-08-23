import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Make Vitest globals available
global.vi = vi;

// Mock matchMedia
if (!('matchMedia' in window)) {
  // @ts-expect-error augmenting jsdom
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    dispatchEvent: vi.fn(),
  });
}

// Mock ResizeObserver
if (!('ResizeObserver' in window)) {
  // @ts-expect-error augmenting jsdom
  window.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;
}

// Mock IntersectionObserver
if (!('IntersectionObserver' in window)) {
  // @ts-expect-error augmenting jsdom
  window.IntersectionObserver = class {
    constructor() {}
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root: Element | null = null;
    rootMargin = '';
    thresholds: number[] = [];
  } as unknown as typeof IntersectionObserver;
}

// Mock canvas getContext
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () =>
      ({
        canvas: document.createElement('canvas'),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 }) as TextMetrics),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
      }) as unknown as CanvasRenderingContext2D
  );
}
