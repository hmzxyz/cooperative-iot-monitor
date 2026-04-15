#include <WiFi.h>
#include <PubSubClient.h>

// Change these values before uploading to your ESP32.
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.100.72";
const int mqtt_port = 1883;
const char* mqtt_topic = "esp32/sensors";

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
      // Subscribe to the same topic if we ever want to receive messages.
      client.subscribe(mqtt_topic);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(2000);
    }
  }
}

// Build a JSON payload string from the simulated sensor values.
String buildJsonPayload(float temperature, float pressure, float milkWeight, const char* alert, unsigned long timestamp) {
  char buffer[256];
  snprintf(buffer, sizeof(buffer),
           "{\"temperature\":%.1f,\"pressure\":%.2f,\"milk_weight\":%.1f,\"alert\":\"%s\",\"timestamp\":%lu}",
           temperature,
           pressure,
           milkWeight,
           alert,
           timestamp);
  return String(buffer);
}

void setup() {
  // Initialize serial logging for debugging in the Arduino Monitor.
  Serial.begin(115200);
  connectWiFi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  // Keep the MQTT connection alive.
  if (!client.connected()) {
    reconnectMQTT();
  }

  client.loop();

  // Generate simulated sensor values.
  float temperature = 18.0 + random(0, 260) / 10.0;  // 18.0 - 44.0°C
  float pressure = 1.0 + random(0, 450) / 100.0;     // 1.00 - 5.50 bar
  float milkWeight = 10.0 + random(0, 420) / 10.0;   // 10.0 - 52.0 kg
  unsigned long timestamp = millis();

  // Decide if the current reading should create an alert.
  const char* alert = "nominal";
  if (temperature > 45.0 || pressure > 4.0 || milkWeight > 45.0) {
    alert = "critical";
  } else if (temperature > 40.0 || pressure > 3.5 || milkWeight > 40.0) {
    alert = "warning";
  }

  String payload = buildJsonPayload(temperature, pressure, milkWeight, alert, timestamp);

  // Publish the simulated sensor reading to the MQTT broker.
  client.publish(mqtt_topic, payload.c_str());
  Serial.print("Published MQTT payload: ");
  Serial.println(payload);

  // Wait a few seconds before sending the next simulated reading.
  delay(5000);
}
