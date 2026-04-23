import { BaseSensor } from './BaseSensor.js';

// Humidity is inversely correlated with temperature (warmer air holds less relative humidity)
export class HumiditySensor extends BaseSensor {
  constructor(tempSensor) {
    super({ min: 40, max: 90, initial: 65, stepFraction: 0.025 });
    this._temp = tempSensor;
  }

  tick() {
    const tempDeviation = this._temp.read() - 26; // deviation from mid-range
    const thermalInfluence = -tempDeviation * 0.08; // negative correlation
    const noise = (Math.random() - 0.5) * 2 * this.step;
    this.value = this._clamp(this.value + noise + thermalInfluence);
    return this.value;
  }
}
