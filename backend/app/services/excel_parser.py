"""
Parse an Excel (.xlsx / .xls) file of target companies using pandas.

Supported column names (case-insensitive, parentheses ignored):
  name / company / company_name / organization / employer / petitioner
  website / url / homepage
  careers_url / careers / jobs_url
  industry / sector / category / naics / industry_naics_code
  notes / description
  city / petitioner_city  +  state / petitioner_state  → combined into notes
"""
import io
import re

import pandas as pd

from app.services.csv_parser import COLUMN_MAP

_CITY_KEYS = {"city", "petitioner_city"}
_STATE_KEYS = {"state", "petitioner_state"}
_NUMERIC_RE = re.compile(r"^\d+$")


def _norm(col: str) -> str:
    """Lowercase, strip non-alphanumeric chars (incl. parens), collapse to underscores."""
    key = re.sub(r"[^a-z0-9 ]", "", col.lower()).strip()
    return re.sub(r"\s+", "_", key)


def parse_companies_from_excel(excel_bytes: bytes) -> list[dict]:
    # pandas read_excel is 5-10x faster than openpyxl row-iteration on large files
    df = pd.read_excel(io.BytesIO(excel_bytes), dtype=str, engine="openpyxl")
    df = df.fillna("")

    # Map raw column names → our field names
    field_map: dict[str, str] = {}
    city_col: str | None = None
    state_col: str | None = None

    for col in df.columns:
        key = _norm(str(col))
        if key in COLUMN_MAP:
            field_map[col] = COLUMN_MAP[key]
        if key in _CITY_KEYS:
            city_col = col
        if key in _STATE_KEYS:
            state_col = col

    if not any(v == "name" for v in field_map.values()):
        # Fall back: first column as name
        field_map[df.columns[0]] = "name"

    companies: list[dict] = []
    seen: set[str] = set()

    for record in df.to_dict("records"):
        entry: dict = {}
        for col, field in field_map.items():
            val = str(record.get(col, "")).strip()
            if val and val.lower() not in ("nan", "none", ""):
                entry[field] = val

        name = entry.get("name", "").strip()
        if not name or len(name) < 2 or _NUMERIC_RE.match(name):
            continue
        if name.lower() in seen:
            continue
        seen.add(name.lower())

        # Combine city + state into notes when no notes exist
        city = str(record.get(city_col, "")).strip() if city_col else ""
        state = str(record.get(state_col, "")).strip() if state_col else ""
        city = "" if city.lower() in ("nan", "none") else city
        state = "" if state.lower() in ("nan", "none") else state
        if (city or state) and not entry.get("notes"):
            entry["notes"] = ", ".join(filter(None, [city, state]))

        if entry.get("website") and not entry.get("careers_url"):
            entry["careers_url"] = entry["website"].rstrip("/") + "/careers"

        companies.append(entry)

    return companies
