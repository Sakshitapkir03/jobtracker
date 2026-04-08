"""In-memory status cache — replaces Redis for free-tier deployment."""
from typing import Dict

_status: Dict[str, str] = {}


def get_status(company_id: str) -> str:
    return _status.get(company_id, "idle")


def set_status(company_id: str, status: str) -> None:
    _status[company_id] = status
