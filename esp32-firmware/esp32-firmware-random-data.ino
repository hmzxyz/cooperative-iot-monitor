#include <WiFi.h>
#include <PubSubClient.h>

// Change these values before uploading to your ESP32.
const char* ssid = "TUNISIETELECOM-2.4G-WVq3";
const char* password = "9FA2DGfE";
const char* mqtt_server = "192.168.100.67";
const int mqtt_port = 1883;
const char* device_id = "esp32-firmware-01";
char topic_temperature[96];
char topic_humidity[96];
char topic_weight[96];
char topic_flow[96];

WiFiClient espClient;
PubSubClient client(espClient);

void connectWiFi() {
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    if (!client.connect("ESP32_Sensor_Client")) {
      delay(2000);
    }
  }
}

void setupTopics() {
  snprintf(topic_temperature, sizeof(topic_temperature), "cooperative/device/%s/sensor/temperature", device_id);
  snprintf(topic_humidity, sizeof(topic_humidity), "cooperative/device/%s/sensor/humidity", device_id);
  snprintf(topic_weight, sizeof(topic_weight), "cooperative/device/%s/sensor/weight", device_id);
  snprintf(topic_flow, sizeof(topic_flow), "cooperative/device/%s/sensor/flow", device_id);
}

void publishSensor(const char* topic, float value) {
  char payload[16];
  dtostrf(value, 0, 2, payload);
  client.publish(topic, payload);
}

void setup() {
  connectWiFi();
  client.setServer(mqtt_server, mqtt_port);
  setupTopics();
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }

  client.loop();

  float temperature = 18.0 + random(0, 170) / 10.0;  // 18.0 - 35.0 °C
  float humidity = 40.0 + random(0, 500) / 10.0;     // 40.0 - 90.0 %
  float weight = 0.0 + random(0, 500) / 10.0;        // 0.0 - 50.0 kg
  float flow = 0.0 + random(0, 100) / 10.0;          // 0.0 - 10.0 L/min

  publishSensor(topic_temperature, temperature);
  publishSensor(topic_humidity, humidity);
  publishSensor(topic_weight, weight);
  publishSensor(topic_flow, flow);

  delay(5000);
}
