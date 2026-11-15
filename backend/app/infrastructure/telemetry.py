"""Structured logging TelemetryPort adapter."""

import logging

from app.application.ports import TelemetryPort

logger = logging.getLogger("fashion_pal.telemetry")


class LoggingTelemetryAdapter(TelemetryPort):
    """Logs structured application events via Python logging."""

    def record_event(self, name: str, attributes: dict[str, str | int | float | bool]) -> None:
        logger.info("telemetry_event=%s attrs=%s", name, attributes)
