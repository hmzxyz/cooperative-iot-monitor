from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

import paho.mqtt.client as mqtt

from app.database import AsyncSessionLocal
from app.telemetry import (
    TelemetryValidationError,
    broadcast_readings,
    persist_canonical_telemetry,
    validate_telemetry_payload,
)


logger = logging.getLogger(__name__)

DEFAULT_MQTT_TOPIC = "cooperative/device/+/telemetry"


class MQTTSubscriber:
    def __init__(self, realtime_manager: Any | None = None) -> None:
        self.host = os.getenv("MQTT_BROKER_HOST", "localhost")
        self.port = int(os.getenv("MQTT_BROKER_PORT", "1883"))
        self.topic = os.getenv("MQTT_TOPIC", DEFAULT_MQTT_TOPIC)
        self.realtime_manager = realtime_manager
        self._client: mqtt.Client | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._client = self._build_client()
        self._client.reconnect_delay_set(min_delay=1, max_delay=30)
        self._client.connect_async(self.host, self.port, keepalive=60)
        self._client.loop_start()
        logger.info("MQTT subscriber starting: %s:%s topic=%s", self.host, self.port, self.topic)

    async def stop(self) -> None:
        if not self._client:
            return
        logger.info("MQTT subscriber stopping")
        self._client.disconnect()
        self._client.loop_stop()
        self._client = None

    def _build_client(self) -> mqtt.Client:
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="cooperative-iot-backend")
        except (AttributeError, TypeError):
            client = mqtt.Client(client_id="cooperative-iot-backend")

        client.on_connect = self._on_connect
        client.on_disconnect = self._on_disconnect
        client.on_message = self._on_message
        return client

    def _on_connect(self, client: mqtt.Client, userdata: Any, flags: Any, reason_code: Any, properties: Any = None) -> None:
        if _reason_failed(reason_code):
            logger.error("MQTT connection failed: %s", reason_code)
            return
        client.subscribe(self.topic)
        logger.info("MQTT subscriber connected and subscribed to %s", self.topic)

    def _on_disconnect(
        self,
        client: mqtt.Client,
        userdata: Any,
        disconnect_flags: Any,
        reason_code: Any,
        properties: Any = None,
    ) -> None:
        if _reason_failed(reason_code):
            logger.warning("MQTT subscriber disconnected: %s", reason_code)
        else:
            logger.info("MQTT subscriber disconnected")

    def _on_message(self, client: mqtt.Client, userdata: Any, message: mqtt.MQTTMessage) -> None:
        if not self._loop:
            logger.warning("MQTT message received before event loop was ready")
            return

        future = asyncio.run_coroutine_threadsafe(
            self._handle_message(message.topic, bytes(message.payload)),
            self._loop,
        )
        future.add_done_callback(_log_task_result)

    async def _handle_message(self, topic: str, payload_bytes: bytes) -> None:
        try:
            payload = json.loads(payload_bytes.decode("utf-8"))
            telemetry = validate_telemetry_payload(payload, expected_device_id=_device_id_from_topic(topic))
        except (UnicodeDecodeError, json.JSONDecodeError, TelemetryValidationError) as exc:
            logger.warning("Rejected MQTT telemetry on %s: %s", topic, exc)
            return

        async with AsyncSessionLocal() as db:
            reading = await persist_canonical_telemetry(db, telemetry)

        await broadcast_readings(self.realtime_manager, [reading])
        logger.info("Accepted MQTT telemetry device_id=%s tick=%s status=%s", reading.device_id, reading.tick, reading.status)


def _device_id_from_topic(topic: str) -> str | None:
    parts = topic.split("/")
    if len(parts) == 4 and parts[0] == "cooperative" and parts[1] == "device" and parts[3] == "telemetry":
        return parts[2]
    return None


def _reason_failed(reason_code: Any) -> bool:
    if hasattr(reason_code, "is_failure"):
        is_failure = reason_code.is_failure
        return bool(is_failure() if callable(is_failure) else is_failure)
    try:
        return int(reason_code) != 0
    except (TypeError, ValueError):
        return str(reason_code).lower() not in {"0", "success", "normal disconnection"}


def _log_task_result(future: asyncio.Future[Any]) -> None:
    try:
        future.result()
    except Exception:
        logger.exception("Unhandled MQTT telemetry ingestion error")
