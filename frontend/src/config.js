export const DEFAULT_BROKER_URL = 'ws://localhost:9001';
export const FALLBACK_BROKER_URL = 'wss://test.mosquitto.org:8081';

export const MQTT_TOPICS = {
  temperature: 'cooperative/sensor/temperature',
  humidity: 'cooperative/sensor/humidity',
  weight: 'cooperative/sensor/weight',
  flow: 'cooperative/sensor/flow',
};

export const MOCK_INTERVAL_MS = 2000;
export const MQTT_STALE_TIMEOUT_MS = 5000;
export const SENSOR_CONFIGS = {
  temperature: { label: 'Temperature', unit: '°C' },
  humidity: { label: 'Humidity', unit: '%' },
  weight: { label: 'Weight', unit: 'kg' },
  flow: { label: 'Flow', unit: 'L/min' },
};
