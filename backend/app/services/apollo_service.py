import httpx
from urllib.parse import urlparse
from app.config import settings

_TITLES = [
    "recruiter", "talent acquisition", "technical recruiter",
    "hiring manager", "engineering manager", "software engineer",
    "senior software engineer", "staff engineer",
]


def _extract_domain(url: str) -> str | None:
    if not url:
        return None
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        host = parsed.netloc or parsed.path
        return host.replace("www.", "").split("/")[0] or None
    except Exception:
        return None


async def search_contacts(company_name: str, website: str | None = None) -> list[dict]:
    if not settings.apollo_api_key:
        return []

    domain = _extract_domain(website)
    payload: dict = {
        "per_page": 10,
        "page": 1,
        "person_titles": _TITLES,
    }
    if domain:
        payload["organization_domains"] = [domain]
    else:
        payload["q_organization_name"] = company_name

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.apollo.io/v1/mixed_people/search",
            json=payload,
            headers={"x-api-key": settings.apollo_api_key, "Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            return []
        data = resp.json()

    results = []
    for person in data.get("people", []):
        results.append({
            "name": person.get("name") or "Unknown",
            "title": person.get("title"),
            "email": person.get("email"),
            "linkedin_url": person.get("linkedin_url"),
        })
    return results
