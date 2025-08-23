// Small helper utilities using the Web Crypto API to generate non-predictable ids and colors.
// This avoids using Math.random() in places where Sonar flags its use (S2245).

type MaybeCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (arr: Uint8Array) => Uint8Array;
};

function getMaybeCrypto(): MaybeCrypto | undefined {
  const maybe = (globalThis as unknown as { crypto?: unknown }).crypto;
  if (maybe && typeof maybe === 'object') {
    return maybe as MaybeCrypto;
  }
  return undefined;
}

export function secureId(prefix = ''): string {
  const winCrypto = getMaybeCrypto();
  if (winCrypto?.randomUUID) {
    return prefix + winCrypto.randomUUID();
  }
  if (winCrypto?.getRandomValues) {
    const arr = new Uint8Array(16);
    winCrypto.getRandomValues(arr);
    return (
      prefix +
      Array.from(arr)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    );
  }
  // Fallback deterministic id (should not happen in browser environments used by the app)
  return prefix + Date.now().toString(36);
}

export function randomColor(): string {
  const winCrypto = getMaybeCrypto();
  if (winCrypto?.getRandomValues) {
    const arr = new Uint8Array(3);
    winCrypto.getRandomValues(arr);
    return (
      '#' +
      Array.from(arr)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    );
  }
  // Fallback color
  return '#cccccc';
}

export function randomBase36(len = 8): string {
  const winCrypto = getMaybeCrypto();
  if (winCrypto?.getRandomValues) {
    const arr = new Uint8Array(len);
    winCrypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => (b % 36).toString(36))
      .join('');
  }
  return Date.now().toString(36).slice(-len);
}
