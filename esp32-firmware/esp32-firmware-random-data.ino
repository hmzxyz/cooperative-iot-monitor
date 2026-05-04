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

// Connect to the Wi-Fi network and print the assigned IP address.
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

// Reconnect the MQTT client if the connection is lost.
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");

    if (client.connect("ESP32_Sensor_Client")) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
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
  // Initialize serial logging for debugging in the Arduino Monitor.
  Serial.begin(115200);
  connectWiFi();
  client.setServer(mqtt_server, mqtt_port);
  setupTopics();
}

void loop() {
  // Keep the MQTT connection alive.
  if (!client.connected()) {
    reconnectMQTT();
  }

  client.loop();

  // Generate simulated sensor values that match backend/frontend sensor keys.
  float temperature = 18.0 + random(0, 170) / 10.0;  // 18.0 - 35.0 °C
  float humidity = 40.0 + random(0, 500) / 10.0;     // 40.0 - 90.0 %
  float weight = 0.0 + random(0, 500) / 10.0;        // 0.0 - 50.0 kg
  float flow = 0.0 + random(0, 100) / 10.0;          // 0.0 - 10.0 L/min
  unsigned long timestamp = millis();

  // Decide if the current reading should create an alert.
  const char* alert = "nominal";
  if (temperature > 33.0 || humidity > 87.0 || weight > 48.0 || flow > 9.0) {
    alert = "critical";
  } else if (temperature > 30.0 || humidity > 80.0 || weight > 44.0 || flow > 7.0) {
    alert = "warning";
  }

  // Publish each sensor to the topic contract used by backend/frontend.
  publishSensor(topic_temperature, temperature);
  publishSensor(topic_humidity, humidity);
  publishSensor(topic_weight, weight);
  publishSensor(topic_flow, flow);
  Serial.printf("Published sensors: temp=%.2fC humidity=%.2f%% weight=%.2fkg flow=%.2fL/min alert=%s ts=%lu\n",
                temperature,
                humidity,
                weight,
                flow,
                alert,
                timestamp);

  // Wait a few seconds before sending the next simulated reading.
  delay(5000);
}
