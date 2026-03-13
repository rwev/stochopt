/**
 * Mulberry32 — fast 32-bit seeded PRNG.
 * Combined with Box-Muller for normal deviates and
 * Knuth's algorithm for Poisson deviates.
 */
export function createRNG(seed: number) {
  let state = seed | 0;

  /** Raw 32-bit unsigned integer */
  function nextU32(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Uniform [0, 1) */
  function uniform(): number {
    return nextU32() / 4294967296;
  }

  /** Standard normal via Box-Muller transform */
  let spare: number | null = null;
  function normal(): number {
    if (spare !== null) {
      const val = spare;
      spare = null;
      return val;
    }
    let u: number, v: number, s: number;
    do {
      u = uniform() * 2 - 1;
      v = uniform() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * mul;
    return u * mul;
  }

  /** Poisson deviate (Knuth's algorithm — fine for small lambda) */
  function poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= uniform();
    } while (p > L);
    return k - 1;
  }

  return { uniform, normal, poisson };
}

export type RNG = ReturnType<typeof createRNG>;
