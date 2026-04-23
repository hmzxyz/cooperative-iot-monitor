import mqtt from 'mqtt';
import { TemperatureSensor } from './sensors/TemperatureSensor.js';
import { HumiditySensor } from './sensors/HumiditySensor.js';
import { WeightSensor } from './sensors/WeightSensor.js';
import { FlowSensor } from './sensors/FlowSensor.js';

const THRESHOLDS = {
  temperature: { warning: 30, critical: 33 },
  humidity:    { warning: 80, critical: 87 },
  weight:      { warning: 44, critical: 48 },
  flow:        { warning: 7,  critical: 9  },
};

function alertLevel(sensorKey, value) {
  const t = THRESHOLDS[sensorKey];
  if (!t) return 'nominal';
  if (value >= t.critical) return 'critical';
  if (value >= t.warning)  return 'warning';
  return 'nominal';
}

export class Device {
  constructor({ deviceId, location, brokerUrl, publishIntervalMs = 2000 }) {
    this.deviceId         = deviceId;
    this.location         = location;
    this.brokerUrl        = brokerUrl;
    this.publishIntervalMs = publishIntervalMs;
    this._startTime       = Date.now();

    const temp    = new TemperatureSensor();
    const humidity = new HumiditySensor(temp);
    const weight  = new WeightSensor();
    const flow    = new FlowSensor(weight);

    // Sensor tick order matters: weight must tick before flow reads it
    this._sensors = [
      ['temperature', temp],
      ['humidity',    humidity],
      ['weight',      weight],
      ['flow',        flow],
    ];
  }

  start() {
    const client = mqtt.connect(this.brokerUrl, {
      clientId: `${this.deviceId}-${Date.now()}`,
      reconnectPeriod: 3000,
    });

    client.on('connect', () => {
      console.log(`[${this.deviceId}] connected to ${this.brokerUrl}`);
      this._publish(client); // immediate first reading
      this._timer = setInterval(() => this._publish(client), this.publishIntervalMs);
    });

    client.on('reconnect', () => {
      console.warn(`[${this.deviceId}] reconnecting…`);
      clearInterval(this._timer);
    });

    client.on('error', (err) => console.error(`[${this.deviceId}]`, err.message));
    client.on('close', () => console.warn(`[${this.deviceId}] disconnected`));
  }

  _publish(client) {
    const readings = {};
    const alerts   = [];

    for (const [type, sensor] of this._sensors) {
      const value = sensor.tick();
      readings[type] = value;

      client.publish(
        `cooperative/device/${this.deviceId}/sensor/${type}`,
        String(value),
        { qos: 0, retain: false },
      );

      const level = alertLevel(type, value);
      if (level !== 'nominal') alerts.push({ sensor: type, level, value });
    }

    // Status heartbeat (retained so new subscribers get current state immediately)
    client.publish(
      `cooperative/device/${this.deviceId}/status`,
      JSON.stringify({
        online:   true,
        uptime:   Math.floor((Date.now() - this._startTime) / 1000),
        location: this.location,
        alerts,
        ts:       Date.now(),
      }),
      { qos: 0, retain: true },
    );

    if (alerts.length > 0) {
      const summary = alerts.map((a) => `${a.sensor}=${a.value}[${a.level}]`).join(' ');
      console.warn(`[${this.deviceId}] ALERT ${summary}`);
    } else {
      const summary = Object.entries(readings).map(([k, v]) => `${k}=${v}`).join(' ');
      console.log(`[${this.deviceId}] ${summary}`);
    }
  }
}
