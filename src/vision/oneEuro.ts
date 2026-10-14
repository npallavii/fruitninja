// One Euro filter: removes jitter when the hand is still, stays responsive when it moves fast.
// Casiez et al., "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input" (CHI 2012).
class LowPass {
  private y: number | null = null;
  filter(x: number, alpha: number): number {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
  last(): number | null {
    return this.y;
  }
  reset(): void {
    this.y = null;
  }
}

const alphaFor = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

export class OneEuro {
  private x = new LowPass();
  private dx = new LowPass();
  private lastT: number | null = null;

  constructor(
    private minCutoff = 1.2,
    private beta = 0.008,
    private dCutoff = 1.0,
  ) {}

  filter(value: number, tSeconds: number): number {
    const dt = this.lastT === null ? 1 / 30 : Math.max(1e-3, tSeconds - this.lastT);
    this.lastT = tSeconds;
    const prev = this.x.last();
    const deriv = prev === null ? 0 : (value - prev) / dt;
    const edx = this.dx.filter(deriv, alphaFor(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, alphaFor(cutoff, dt));
  }

  reset(): void {
    this.x.reset();
    this.dx.reset();
    this.lastT = null;
  }
}
