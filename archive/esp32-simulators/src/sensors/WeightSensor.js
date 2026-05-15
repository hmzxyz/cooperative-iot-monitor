import { BaseSensor } from './BaseSensor.js';

// Simulates a milk collection tank:
//   FILL phase  — slow steady accumulation with slight noise
//   DRAIN phase — fast collection event (tank emptied by operator)
const FILL_RATE = 0.35;  // kg per tick
const DRAIN_RATE = 4.0;  // kg per tick during collection

export class WeightSensor extends BaseSensor {
  constructor() {
    super({ min: 0, max: 50, initial: 2, stepFraction: 0.005 });
    this._draining = false;
    this._fillTarget = this._nextFillTarget();
  }

  _nextFillTarget() {
    return 38 + Math.random() * 10; // 38–48 kg before triggering collection
  }

  tick() {
    if (this._draining) {
      this.value = Math.max(0, this.value - DRAIN_RATE);
      if (this.value <= 0.5) {
        this._draining = false;
        this._fillTarget = this._nextFillTarget();
      }
    } else {
      const noise = (Math.random() - 0.4) * this.step * 2;
      this.value = Math.min(this.max, this.value + FILL_RATE + noise);
      if (this.value >= this._fillTarget) {
        this._draining = true;
      }
    }
    return parseFloat(this.value.toFixed(2));
  }

  isDraining() {
    return this._draining;
  }
}
