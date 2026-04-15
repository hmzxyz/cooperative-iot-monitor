import json
import threading

import paho.mqtt.client as mqtt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud import create_sensor_reading
from app.db.session import SessionLocal
from app.schemas import SensorReadingCreate


def _on_connect(client: mqtt.Client, userdata: dict, flags: dict, rc: int) -> None:
    """Called when the MQTT client connects to the broker."""
    if rc == 0:
        print(f"Connected to MQTT broker at {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
        client.subscribe(settings.MQTT_TOPIC)
    else:
        print(f"MQTT connect failed with code {rc}")


def _on_message(client: mqtt.Client, userdata: dict, msg: mqtt.MQTTMessage) -> None:
    """Called when a message is received from the subscribed MQTT topic."""
    try:
        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)
        reading = SensorReadingCreate(
            temperature=float(data.get("temperature", 0.0)),
            pressure=float(data.get("pressure", 0.0)),
            milk_weight=float(data.get("milk_weight", 0.0)),
            alert=data.get("alert"),
            topic=msg.topic,
            payload=data,
        )
        db: Session = SessionLocal()
        try:
            create_sensor_reading(db=db, data=reading)
        finally:
            db.close()
    except Exception as exc:
        print(f"Failed to persist MQTT message: {exc}")


def _start_client() -> None:
    """Start the MQTT client and block on its event loop."""
    client = mqtt.Client()
    client.on_connect = _on_connect
    client.on_message = _on_message
    client.connect(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, keepalive=60)
    client.loop_forever()


def start_mqtt_listener() -> None:
    """Run the MQTT client in a background thread during backend startup."""
    thread = threading.Thread(target=_start_client, daemon=True)
    thread.start()
