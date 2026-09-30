"""
Mock weather data shared by API mode.

The MCP server has its own copy in mcp-server/tools.py, because in real life
it would be a separate service. A test makes sure both copies stay identical,
so the two modes can be compared fairly.
"""

from __future__ import annotations

from typing import Any

WEATHER_DATA: dict[str, dict[str, Any]] = {
    "Mumbai": {"temperature_celsius": 29, "condition": "Partly cloudy", "humidity": 72},
    "Delhi": {"temperature_celsius": 33, "condition": "Hazy sunshine", "humidity": 41},
    "Bangalore": {"temperature_celsius": 24, "condition": "Light rain", "humidity": 80},
    "London": {"temperature_celsius": 14, "condition": "Overcast", "humidity": 77},
    "New York": {"temperature_celsius": 18, "condition": "Clear skies", "humidity": 55},
    "Singapore": {"temperature_celsius": 31, "condition": "Thunderstorms", "humidity": 84},
}

# Returned for any city that is not in WEATHER_DATA.
FALLBACK_WEATHER: dict[str, Any] = {"temperature_celsius": 22, "condition": "Mild", "humidity": 60}

DEMO_NOTE = "Demo data — not live weather"


def get_weather(city: str) -> dict[str, Any]:
    """Return deterministic demo weather for a city."""
    name = " ".join(city.strip().split())[:60]
    for known_city, data in WEATHER_DATA.items():
        if known_city.lower() == name.lower():
            return {"city": known_city, **data, "source": DEMO_NOTE}
    return {"city": name.title() or "Unknown", **FALLBACK_WEATHER, "source": DEMO_NOTE}
