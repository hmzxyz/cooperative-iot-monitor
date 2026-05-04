import mqtt from 'mqtt';
import { DEVICE_TOPIC_WILDCARD, MOCK_INTERVAL_MS, MQTT_STALE_TIMEOUT_MS, parseSensorTopic } from './config.js';

const MOCK_SENSOR_PROFILES = {
  temperature: { min: 18, max: 35, initial: 24.2 },
  humidity: { min: 40, max: 90, initial: 63.5 },
  weight: { min: 0, max: 50, initial: 2.5 },
  flow: { min: 0, max: 10, initial: 1.9 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const randomInitial = ({ min, max, initial }) => {
  if (Number.isFinite(initial)) {
    return Number(initial.toFixed(1));
  }
  return Number((Math.random() * (max - min) + min).toFixed(1));
};

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
    this.mockTick = 0;
    this.fillTarget = 40.5;
    this.isCollecting = false;
    this.mockValues = Object.fromEntries(
      Object.entries(MOCK_SENSOR_PROFILES).map(([sensorKey, profile]) => [
        sensorKey,
        randomInitial(profile),
      ])
    );
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
    if (this.client) {
      this.client.subscribe(DEVICE_TOPIC_WILDCARD, { qos: 0 }, (err) => {
        if (err) console.warn('Subscribe failed:', err);
      });
    }
  }

  handleMessage(topic, payload) {
    const parsed = parseSensorTopic(topic);
    const value = parseFloat(payload);
    if (!parsed || Number.isNaN(value)) {
      return;
    }
    const { sensorKey } = parsed;

    this.lastMessageAt = Date.now();
    this.mockActive = false;
    this.onMockModeChange(false);
    this.mockValues[sensorKey] = Number(value.toFixed(1));
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

    this.mockTick += 1;
    const temperature = this.nextTemperature();
    const humidity = this.nextHumidity(temperature);
    const weight = this.nextWeight();
    const flow = this.nextFlow(weight);

    this.publishMockValue('temperature', temperature);
    this.publishMockValue('humidity', humidity);
    this.publishMockValue('weight', weight);
    this.publishMockValue('flow', flow);
  }

  publishMockValue(sensorKey, value) {
    const profile = MOCK_SENSOR_PROFILES[sensorKey];
    const nextValue = Number(clamp(value, profile.min, profile.max).toFixed(1));
    this.mockValues[sensorKey] = nextValue;
    this.onData(sensorKey, nextValue, true);
  }

  nextTemperature() {
    const base = 24.3 + Math.sin(this.mockTick / 8) * 1.2;
    const loadInfluence = this.isCollecting ? 0.8 : -0.15;
    const drift = ((Math.random() - 0.5) * 0.3);
    return base + loadInfluence + drift;
  }

  nextHumidity(temperature) {
    const inverseCorrelation = 68 - (temperature - 24.3) * 1.9;
    const drift = ((Math.random() - 0.5) * 0.8);
    return inverseCorrelation + drift;
  }

  nextWeight() {
    if (this.isCollecting) {
      const drop = 4.2 + Math.random() * 0.6;
      const next = this.mockValues.weight - drop;
      if (next <= 0.5) {
        this.isCollecting = false;
        this.fillTarget = 38 + Math.random() * 8;
        return 0.4 + Math.random() * 0.2;
      }
      return next;
    }

    const fill = 0.38 + Math.random() * 0.12;
    const noise = (Math.random() - 0.45) * 0.15;
    const next = this.mockValues.weight + fill + noise;
    if (next >= this.fillTarget) {
      this.isCollecting = true;
    }
    return next;
  }

  nextFlow(weight) {
    if (this.isCollecting) {
      return Math.random() * 0.2;
    }

    const previousWeight = Number.isFinite(this.mockValues.weight) ? this.mockValues.weight : weight;
    const positiveDelta = Math.max(0, weight - previousWeight);
    const base = 1.4 + positiveDelta * 4.8;
    const noise = (Math.random() - 0.5) * 0.25;
    return base + noise;
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
