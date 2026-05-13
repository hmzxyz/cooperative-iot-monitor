#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "TUNISIETELECOM-2.4G-WVq3";
const char* WIFI_PASSWORD = "9FA2DGfE";
const char* MQTT_HOST = "192.168.100.67";
const int MQTT_PORT = 1883;
const char* DEVICE_ID = "esp32-humidity-temp-01";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

char topicTemperature[96];
char topicHumidity[96];
unsigned long lastPublishMs = 0;
const unsigned long PUBLISH_INTERVAL_MS = 3000;

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
  snprintf(topicTemperature, sizeof(topicTemperature), "cooperative/device/%s/sensor/temperature", DEVICE_ID);
  snprintf(topicHumidity, sizeof(topicHumidity), "cooperative/device/%s/sensor/humidity", DEVICE_ID);
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

  char payload[16];
  dtostrf(temperature, 0, 2, payload);
  mqttClient.publish(topicTemperature, payload);
  dtostrf(humidity, 0, 2, payload);
  mqttClient.publish(topicHumidity, payload);
}
