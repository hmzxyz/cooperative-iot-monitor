import os
import threading
import paho.mqtt.client as mqtt
from datetime import datetime, timezone

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))

# cooperative/device/{device_id}/sensor/{sensor_id}
TOPIC_PATTERN = "cooperative/device/+/sensor/+"


def _parse_topic(topic: str):
    """Return (device_id, sensor_id) from a device topic, or (None, None) on mismatch."""
    parts = topic.split("/")
    # parts: ['cooperative', 'device', device_id, 'sensor', sensor_id]
    if len(parts) == 5 and parts[0] == "cooperative" and parts[1] == "device" and parts[3] == "sensor":
        return parts[2], parts[4]
    return None, None


def start_subscriber(session_factory):
    def on_connect(client, userdata, flags, reason_code, properties):
        client.subscribe(TOPIC_PATTERN)
        print(f"[mqtt] subscribed to {TOPIC_PATTERN!r}")

    def on_message(client, userdata, msg):
        from app.models.sensor_reading import SensorReading

        device_id, sensor_id = _parse_topic(msg.topic)
        if not device_id:
            return

        try:
            value = float(msg.payload.decode())
        except ValueError:
            return

        reading = SensorReading(
            device_id=device_id,
            sensor_id=sensor_id,
            payload={"value": value},
            timestamp=datetime.now(timezone.utc),
        )
        db = session_factory()
        try:
            db.add(reading)
            db.commit()
        finally:
            db.close()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)

    thread = threading.Thread(target=client.loop_forever, daemon=True)
    thread.start()
    return client
