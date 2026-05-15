import { readFileSync } from 'fs';
import { Device } from './src/Device.js';

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const configPath = new URL('./config/devices.json', import.meta.url);
const devices    = JSON.parse(readFileSync(configPath, 'utf-8'));

console.log(`[simulator] starting ${devices.length} device(s) → ${BROKER_URL}`);

for (const cfg of devices) {
  new Device({ ...cfg, brokerUrl: BROKER_URL }).start();
}
