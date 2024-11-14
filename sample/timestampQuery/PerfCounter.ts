// A minimalistic perf timer class that computes mean + stddev online
export default class PerfCounter {
  sampleCount: number;
  accumulated: number;
  accumulatedSq: number;

  constructor() {
    this.sampleCount = 0;
    this.accumulated = 0;
    this.accumulatedSq = 0;
  }

  addSample(value: number) {
    this.sampleCount += 1;
    this.accumulated += value;
    this.accumulatedSq += value * value;
  }

  getAverage(): number {
    return this.sampleCount === 0 ? 0 : this.accumulated / this.sampleCount;
  }

  getStddev(): number {
    if (this.sampleCount === 0) return 0;
    const avg = this.getAverage();
    const variance = this.accumulatedSq / this.sampleCount - avg * avg;
    return Math.sqrt(Math.max(0.0, variance));
  }
}
