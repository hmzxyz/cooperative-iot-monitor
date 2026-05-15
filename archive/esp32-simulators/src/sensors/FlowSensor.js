import { BaseSensor } from './BaseSensor.js';

// Measures incoming milk flow rate.
// Correlated with WeightSensor state:
//   FILL phase  — steady inflow (1.5–4 L/min)
//   DRAIN phase — near-zero (operator has closed the inlet valve)
export class FlowSensor extends BaseSensor {
  constructor(weightSensor) {
    super({ min: 0, max: 10, initial: 2 });
    this._weight = weightSensor;
    this._prevWeight = weightSensor.read();
  }

  tick() {
    const current = this._weight.read();
    const delta = current - this._prevWeight;
    this._prevWeight = current;

    if (this._weight.isDraining()) {
      // Inlet closed during collection — residual trickle only
      this.value = this._clamp(Math.random() * 0.25);
    } else {
      // Inflow proportional to weight gain rate + sensor noise
      const base = Math.max(0, delta) * 5 + 1.5;
      this.value = this._clamp(base + (Math.random() - 0.5) * 0.4);
    }
    return this.value;
  }
}
