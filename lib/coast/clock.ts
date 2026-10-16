/** Visible time only. The first frame after a pause never integrates the hidden interval. */
export class SceneClock {
  time = 0;
  private previous: number | null = null;
  tick(timestamp: number) {
    if (this.previous !== null) this.time += Math.min(0.05, Math.max(0, (timestamp-this.previous)/1000));
    this.previous = timestamp;
    return this.time;
  }
  suspend() { this.previous = null; }
  seek(seconds: number) {
    this.time = Number.isFinite(seconds) ? Math.max(0,seconds) : 0;
    this.suspend();
  }
}
