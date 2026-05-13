#include <WiFi.h>
#include <PubSubClient.h>

// Update these values before uploading to an ESP32 board.
const char* WIFI_SSID = "TUNISIETELECOM-2.4G-WVq3";
const char* WIFI_PASSWORD = "9FA2DGfE";
const char* MQTT_HOST = "192.168.100.67";
const int MQTT_PORT = 1883;
const char* DEVICE_ID = "esp32-factory-01";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

char topicTemperature[96];
char topicHumidity[96];
char topicWeight[96];
char topicFlow[96];
unsigned long lastPublishMs = 0;
const unsigned long PUBLISH_INTERVAL_MS = 5000;

void buildTopics() {
  snprintf(topicTemperature, sizeof(topicTemperature), "cooperative/device/%s/sensor/temperature", DEVICE_ID);
  snprintf(topicHumidity, sizeof(topicHumidity), "cooperative/device/%s/sensor/humidity", DEVICE_ID);
  snprintf(topicWeight, sizeof(topicWeight), "cooperative/device/%s/sensor/weight", DEVICE_ID);
  snprintf(topicFlow, sizeof(topicFlow), "cooperative/device/%s/sensor/flow", DEVICE_ID);
}

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

void publishFloat(const char* topic, float value) {
  char payload[16];
  dtostrf(value, 0, 2, payload);
  mqttClient.publish(topic, payload);
}

void setup() {
  randomSeed(esp_random());
  buildTopics();
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

  float temperature = 18.0 + random(0, 170) / 10.0;
  float humidity = 40.0 + random(0, 500) / 10.0;
  float weight = random(0, 500) / 10.0;
  float flow = random(0, 100) / 10.0;

  publishFloat(topicTemperature, temperature);
  publishFloat(topicHumidity, humidity);
  publishFloat(topicWeight, weight);
  publishFloat(topicFlow, flow);
}
