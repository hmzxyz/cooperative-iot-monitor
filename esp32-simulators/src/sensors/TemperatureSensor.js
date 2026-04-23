import { BaseSensor } from './BaseSensor.js';

// Slow thermal drift — ambient barn temperature with occasional peaks
export class TemperatureSensor extends BaseSensor {
  constructor() {
    super({ min: 18, max: 35, initial: 24, stepFraction: 0.02 });
  }
}
