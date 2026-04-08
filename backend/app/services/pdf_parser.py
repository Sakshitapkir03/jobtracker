"""
Parse a PDF of target companies.

Expected PDF formats:
  1. One company name per line
  2. Table with columns: Name | Website | Industry
  3. Bullet points with company names

Returns a list of dicts ready for Company model insertion.
"""
import re
import io
import pdfplumber


def parse_companies_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """Extract company data from a PDF file."""
    companies = []
    seen = set()

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            # Try table extraction first
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        if not row or not row[0]:
                            continue
                        name = _clean(row[0])
                        if not name or name.lower() in ("company", "name", "organization"):
                            continue
                        if name in seen:
                            continue
                        seen.add(name)
                        entry: dict = {"name": name}
                        if len(row) > 1 and row[1]:
                            website = _clean(row[1])
                            if _is_url(website):
                                entry["website"] = website
                                entry["careers_url"] = _guess_careers_url(website)
                        if len(row) > 2 and row[2]:
                            entry["industry"] = _clean(row[2])
                        companies.append(entry)
            else:
                # Fall back to line-by-line text extraction
                text = page.extract_text() or ""
                for line in text.splitlines():
                    name = _clean(line)
                    if not name or len(name) < 2 or len(name) > 120:
                        continue
                    if name in seen:
                        continue
                    # Skip headers/footers with digits that look like page numbers
                    if re.match(r"^\d+$", name):
                        continue
                    seen.add(name)
                    companies.append({"name": name})

    return companies


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip()).strip("•-–—*·")


def _is_url(text: str) -> bool:
    return bool(re.match(r"https?://|www\.", text, re.IGNORECASE))


def _guess_careers_url(website: str) -> str:
    base = website.rstrip("/")
    return f"{base}/careers"
