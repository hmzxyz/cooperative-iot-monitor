import os
import logging
import paho.mqtt.client as mqtt
from datetime import datetime, timezone

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
logger = logging.getLogger(__name__)

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
        if reason_code != 0:
            logger.warning("[mqtt] connect failed: reason_code=%s", reason_code)
            return
        client.subscribe(TOPIC_PATTERN)
        logger.info("[mqtt] subscribed to %r", TOPIC_PATTERN)

    def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
        if reason_code != 0:
            logger.warning("[mqtt] disconnected unexpectedly: reason_code=%s", reason_code)

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
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=30)
    client.connect_async(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()

    return client
