#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "TUNISIETELECOM-2.4G-WVq3";
const char* WIFI_PASSWORD = "9FA2DGfE";
const char* MQTT_HOST = "192.168.100.67";
const int MQTT_PORT = 1883;
const char* DEVICE_ID = "esp32-balance-01";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

char topicWeight[96];
char topicFlow[96];
unsigned long lastPublishMs = 0;
const unsigned long PUBLISH_INTERVAL_MS = 2000;

float currentWeight = 5.0;
bool draining = false;

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    char clientId[64];
    snprintf(clientId, sizeof(clientId), "%s-client", DEVICE_ID);
    if (!mqttClient.connect(clientId)) {
      delay(2000);
    }
  }
}

void setup() {
  randomSeed(esp_random());
  snprintf(topicWeight, sizeof(topicWeight), "cooperative/device/%s/sensor/weight", DEVICE_ID);
  snprintf(topicFlow, sizeof(topicFlow), "cooperative/device/%s/sensor/flow", DEVICE_ID);
  connectWiFi();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastPublishMs < PUBLISH_INTERVAL_MS) {
    return;
  }
  lastPublishMs = now;

  if (draining) {
    currentWeight -= 3.0;
    if (currentWeight <= 2.0) {
      currentWeight = 2.0;
      draining = false;
    }
  } else {
    currentWeight += 0.6 + random(0, 7) / 10.0;
    if (currentWeight >= 46.0) {
      draining = true;
    }
  }

  float flow = draining ? random(0, 3) / 10.0 : (1.5 + random(0, 35) / 10.0);
  if (currentWeight < 0) currentWeight = 0;
  if (currentWeight > 50) currentWeight = 50;

  char payload[16];
  dtostrf(currentWeight, 0, 2, payload);
  mqttClient.publish(topicWeight, payload);
  dtostrf(flow, 0, 2, payload);
  mqttClient.publish(topicFlow, payload);
}
