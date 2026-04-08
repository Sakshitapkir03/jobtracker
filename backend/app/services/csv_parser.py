"""
Parse a CSV of target companies.

Supported column names (case-insensitive, any order):
  name / company / company_name / organization
  website / url / homepage
  careers_url / careers / jobs_url
  industry / sector / category
  notes / description

Minimum requirement: a column that maps to company name.
"""
import csv
import io
import re


# Maps any of these header variants → our field name
COLUMN_MAP = {
    # Company name variants
    "name": "name",
    "company": "name",
    "company_name": "name",
    "organization": "name",
    "employer": "name",
    "employer_name": "name",
    "petitioner": "name",
    "petitioner_name": "name",
    "employer_petitioner_name": "name",
    # Website variants
    "website": "website",
    "url": "website",
    "homepage": "website",
    # Careers URL variants
    "careers_url": "careers_url",
    "careers": "careers_url",
    "jobs_url": "careers_url",
    # Industry variants
    "industry": "industry",
    "sector": "industry",
    "category": "industry",
    "naics": "industry",
    "industry_naics_code": "industry",
    "industry_naics": "industry",
    # Notes/description
    "notes": "notes",
    "description": "notes",
}


def parse_companies_from_csv(csv_bytes: bytes) -> list[dict]:
    text = csv_bytes.decode("utf-8-sig", errors="replace")  # handle BOM
    reader = csv.DictReader(io.StringIO(text))

    if not reader.fieldnames:
        # No header — treat each line as a company name
        return _parse_headerless(text)

    # Build column mapping from actual headers
    header_map: dict[str, str] = {}
    for col in reader.fieldnames:
        key = col.strip().lower().replace(" ", "_").replace("-", "_")
        if key in COLUMN_MAP:
            header_map[col] = COLUMN_MAP[key]

    if not any(v == "name" for v in header_map.values()):
        # No name column found — fall back to treating first column as name
        first_col = reader.fieldnames[0]
        header_map[first_col] = "name"

    companies = []
    seen: set[str] = set()

    for row in reader:
        entry: dict = {}
        for csv_col, field in header_map.items():
            val = (row.get(csv_col) or "").strip()
            if val:
                entry[field] = val

        name = entry.get("name", "").strip()
        if not name or len(name) < 2:
            continue
        if name.lower() in seen:
            continue
        seen.add(name.lower())

        # Auto-guess careers URL if website present but careers_url missing
        if entry.get("website") and not entry.get("careers_url"):
            entry["careers_url"] = entry["website"].rstrip("/") + "/careers"

        companies.append(entry)

    return companies


def _parse_headerless(text: str) -> list[dict]:
    """One company name per line, no header row."""
    companies = []
    seen: set[str] = set()
    for line in text.splitlines():
        name = line.strip().strip(",")
        if not name or len(name) < 2 or name.lower() in seen:
            continue
        seen.add(name.lower())
        companies.append({"name": name})
    return companies
