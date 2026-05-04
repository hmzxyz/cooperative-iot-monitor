export const DEFAULT_BROKER_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:9001';

// Wildcard subscription for cooperative/device/{deviceId}/sensor/{type}.
export const DEVICE_TOPIC_WILDCARD = 'cooperative/device/+/sensor/+';

// Known sensor types (used for validation and mock data keys)
export const MQTT_TOPICS = {
  temperature: 'cooperative/device/+/sensor/temperature',
  humidity:    'cooperative/device/+/sensor/humidity',
  weight:      'cooperative/device/+/sensor/weight',
  flow:        'cooperative/device/+/sensor/flow',
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
  humidity:    { label: 'Humidity', unit: '%' },
  weight:      { label: 'Weight', unit: 'kg' },
  flow:        { label: 'Flow', unit: 'L/min' },
};
