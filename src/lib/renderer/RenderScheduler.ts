/**
 * Throttles a callback so it fires at most once per `intervalMs`.
 * Useful for render progress updates (spec §18: 10–20 updates/second).
 */
export class Throttled {
  private last = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingArgs: unknown[] | null = null;

  constructor(
    private readonly fn: (...args: unknown[]) => void,
    private readonly intervalMs = 100
  ) {}

  private fire(args: unknown[]) {
    this.last = performance.now();
    this.timer = null;
    this.pendingArgs = null;
    this.fn(...args);
  }

  call(...args: unknown[]): void {
    const now = performance.now();
    if (now - this.last >= this.intervalMs) {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.fire(args);
      return;
    }
    this.pendingArgs = args;
    if (!this.timer) {
      this.timer = setTimeout(() => {
        if (this.pendingArgs) this.fire(this.pendingArgs);
      }, this.intervalMs - (now - this.last));
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pendingArgs) this.fire(this.pendingArgs);
  }
}