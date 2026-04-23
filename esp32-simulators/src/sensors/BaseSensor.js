export class BaseSensor {
  constructor({ min, max, initial, stepFraction = 0.04 }) {
    this.min = min;
    this.max = max;
    this.value = initial ?? (min + max) / 2;
    this.step = (max - min) * stepFraction;
  }

  _clamp(v) {
    return parseFloat(Math.max(this.min, Math.min(this.max, v)).toFixed(2));
  }

  tick() {
    this.value = this._clamp(this.value + (Math.random() - 0.5) * 2 * this.step);
    return this.value;
  }

  read() {
    return this.value;
  }
}
