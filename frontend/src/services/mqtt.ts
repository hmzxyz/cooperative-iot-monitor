import mqtt, { MqttClient } from 'mqtt';

// MQTT broker WebSocket URL and topic are configured via the frontend environment.
const MQTT_WS_URL = import.meta.env.VITE_MQTT_WS_URL ?? 'ws://localhost:9001';
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC ?? 'esp32/sensors';

/**
 * Connect to the MQTT broker and listen for sensor messages.
 */
export function connectMqtt(onMessage: (data: any) => void): MqttClient {
  const client = mqtt.connect(MQTT_WS_URL);

  client.on('connect', () => {
    client.subscribe(MQTT_TOPIC, { qos: 0 });
  });

  client.on('message', (_, rawPayload) => {
    try {
      const message = JSON.parse(rawPayload.toString());
      onMessage(message);
    } catch (error) {
      console.error('Invalid MQTT payload', error);
    }
  });

  client.on('error', (error) => {
    console.error('MQTT client error', error);
  });

  return client;
}

/**
 * Disconnect cleanly from the MQTT broker.
 */
export function disconnectMqtt(client: MqttClient) {
  client.end(true);
}
