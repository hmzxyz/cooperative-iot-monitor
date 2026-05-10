export const DEFAULT_BROKER_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:9001';

// Wildcard subscription for cooperative/device/{deviceId}/sensor/{type}.
export const DEVICE_TOPIC_WILDCARD = 'cooperative/device/+/sensor/+';

// Known sensor types (used for validation and mock data keys)
export const MQTT_TOPICS = {
  temperature: 'cooperative/device/+/sensor/temperature',
  vibration: 'cooperative/device/+/sensor/vibration',
  current_amp: 'cooperative/device/+/sensor/current_amp',
  weight_kg: 'cooperative/device/+/sensor/weight_kg',
  level_percent: 'cooperative/device/+/sensor/level_percent',
};

/**
 * Extract { deviceId, sensorKey } from a device topic string.
 * Returns null if the topic doesn't match the expected pattern.
 */
export function parseSensorTopic(topic) {
  const parts = topic.split('/');
  if (parts.length !== 5 || parts[0] !== 'cooperative' || parts[1] !== 'device' || parts[3] !== 'sensor') {
    return null;
  }
  const sensorKey = parts[4];
  if (!Object.keys(SENSOR_CONFIGS).includes(sensorKey)) return null;
  return { deviceId: parts[2], sensorKey };
}

export const MOCK_INTERVAL_MS = 4000;
export const MQTT_STALE_TIMEOUT_MS = 12000;
export const SENSOR_CONFIGS = {
  temperature: { label: 'Temperature', unit: 'C' },
  vibration: { label: 'Vibration', unit: 'g' },
  current_amp: { label: 'Current', unit: 'A' },
  weight_kg: { label: 'Weight', unit: 'kg' },
  level_percent: { label: 'Level', unit: '%' },
};
