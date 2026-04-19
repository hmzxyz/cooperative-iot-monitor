import mqtt from 'mqtt';
import { MQTT_TOPICS, MOCK_INTERVAL_MS, MQTT_STALE_TIMEOUT_MS } from './config.js';

const randomBetween = (min, max) => Number((Math.random() * (max - min) + min).toFixed(1));

export default class MqttManager {
  constructor({ brokerUrl, onStatusChange, onData, onMockModeChange }) {
    this.brokerUrl = brokerUrl;
    this.onStatusChange = onStatusChange;
    this.onData = onData;
    this.onMockModeChange = onMockModeChange;
    this.client = null;
    this.mockTimer = null;
    this.fallbackTimer = null;
    this.lastMessageAt = 0;
    this.forceMock = false;
    this.mockActive = true;
    this.connected = false;
  }

  connect() {
    this.disconnect();
    this.client = mqtt.connect(this.brokerUrl, {
      connectTimeout: 5000,
      reconnectPeriod: 2000,
      clean: true,
      resubscribe: true,
      clientId: `cooperative-iot-monitor-${Math.random().toString(16).slice(2)}`,
    });

    this.onStatusChange('Connecting');

    this.client.on('connect', () => {
      this.connected = true;
      this.onStatusChange('Connected');
      this.subscribeTopics();
      this.updateFallbackState();
    });

    this.client.on('reconnect', () => {
      this.onStatusChange('Reconnecting');
      this.connected = false;
      this.updateFallbackState();
    });

    this.client.on('offline', () => {
      this.connected = false;
      this.onStatusChange('Disconnected');
      this.updateFallbackState();
    });

    this.client.on('error', (error) => {
      console.warn('MQTT error', error.message || error);
      this.connected = false;
      this.onStatusChange('Disconnected');
      this.updateFallbackState();
    });

    this.client.on('close', () => {
      this.connected = false;
      this.onStatusChange('Disconnected');
      this.updateFallbackState();
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });

    this.startMockLoop();
    this.startFallbackTimer();
  }

  subscribeTopics() {
    Object.values(MQTT_TOPICS).forEach((topic) => {
      if (this.client) {
        this.client.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            console.warn(`Subscribe failed for topic ${topic}:`, err);
          }
        });
      }
    });
  }

  handleMessage(topic, payload) {
    const sensorKey = Object.keys(MQTT_TOPICS).find((key) => MQTT_TOPICS[key] === topic);
    const value = parseFloat(payload);
    if (!sensorKey || Number.isNaN(value)) {
      return;
    }

    this.lastMessageAt = Date.now();
    this.mockActive = false;
    this.onMockModeChange(false);
    this.onData(sensorKey, value, false);
  }

  startMockLoop() {
    if (this.mockTimer) {
      return;
    }

    this.mockTimer = setInterval(() => {
      if (this.forceMock || !this.connected || Date.now() - this.lastMessageAt > MQTT_STALE_TIMEOUT_MS) {
        this.emitMockValues();
      }
    }, MOCK_INTERVAL_MS);
  }

  emitMockValues() {
    if (!this.mockActive) {
      this.mockActive = true;
      this.onMockModeChange(true);
    }

    const values = {
      temperature: randomBetween(18, 35),
      humidity: randomBetween(30, 80),
      weight: randomBetween(0, 500),
      flow: randomBetween(0, 100),
    };

    Object.entries(values).forEach(([key, value]) => {
      this.onData(key, value, true);
    });
  }

  startFallbackTimer() {
    if (this.fallbackTimer) {
      return;
    }

    this.fallbackTimer = setInterval(() => {
      this.updateFallbackState();
    }, 1000);
  }

  updateFallbackState() {
    const stale = !this.connected || Date.now() - this.lastMessageAt > MQTT_STALE_TIMEOUT_MS;
    const shouldMock = this.forceMock || stale;

    if (shouldMock && !this.mockActive) {
      this.mockActive = true;
      this.onMockModeChange(true);
      this.emitMockValues();
    }

    if (!shouldMock && this.mockActive) {
      this.mockActive = false;
      this.onMockModeChange(false);
    }
  }

  setForceMock(value) {
    this.forceMock = Boolean(value);
    this.updateFallbackState();
  }

  updateBrokerUrl(brokerUrl) {
    this.brokerUrl = brokerUrl;
    if (this.client) {
      this.connect();
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }

    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }

    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
}
