"""
Job scraper with ATS-specific strategies.

Priority order:
  1. Greenhouse API  (boards-api.greenhouse.io)  — JSON, no browser
  2. Lever API       (api.lever.co)              — JSON, no browser
  3. Ashby API       (jobs.ashbyhq.com)           — JSON, no browser
  4. Workday         (myworkdayjobs.com)          — JSON via internal API
  5. Playwright fallback for everything else
"""
import re
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from urllib.parse import quote_plus, unquote, urlparse

import httpx
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

logger = logging.getLogger(__name__)

_SKIP_DOMAINS = {
    "linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
    "monster.com", "simplyhired.com", "wellfound.com", "builtinnyc.com",
    "twitter.com", "x.com", "facebook.com", "instagram.com",
    "youtube.com", "wikipedia.org", "reddit.com", "ycombinator.com",
}

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


# ── URL discovery ──────────────────────────────────────────────────────────

async def find_careers_url(company_name: str) -> str | None:
    """
    Try to find a company's careers URL.
    1. Search for known ATS domains first (Greenhouse, Lever, Ashby)
    2. Fall back to general DuckDuckGo search
    """
    # Try ATS-specific search first (most reliable)
    ats_url = await _search_ats_url(company_name)
    if ats_url:
        return ats_url

    # General search fallback
    return await _search_ddg(f"{company_name} careers jobs site")


async def _search_ats_url(company_name: str) -> str | None:
    """Search for company on known ATS platforms."""
    query = quote_plus(
        f'"{company_name}" site:boards.greenhouse.io OR site:jobs.lever.co '
        f'OR site:jobs.ashbyhq.com OR site:apply.workable.com'
    )
    result = await _ddg_first_result(query)
    if result:
        domain = urlparse(result).netloc.lower()
        if any(ats in domain for ats in ["greenhouse.io", "lever.co", "ashbyhq.com", "workable.com"]):
            return result

    # Try each ATS individually with a simpler search
    for ats in ["boards.greenhouse.io", "jobs.lever.co"]:
        query = quote_plus(f"{company_name} site:{ats}")
        result = await _ddg_first_result(query)
        if result and ats in result:
            return result

    return None


async def _search_ddg(query: str) -> str | None:
    search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
    return await _ddg_first_result(search_url, is_full_url=True)


async def _ddg_first_result(query_or_url: str, is_full_url: bool = False) -> str | None:
    url = query_or_url if is_full_url else f"https://html.duckduckgo.com/html/?q={query_or_url}"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers=_HEADERS)
        matches = re.findall(r"uddg=(https?%3A%2F%2F[^&\"<\s]+)", resp.text)
        for encoded in matches[:8]:
            decoded = unquote(encoded)
            netloc = urlparse(decoded).netloc.lower().lstrip("www.")
            if not any(skip in netloc for skip in _SKIP_DOMAINS):
                logger.debug("DDG result: %s", decoded)
                return decoded
    except Exception as exc:
        logger.warning("DDG search failed: %s", exc)
    return None


# ── Main entry point ───────────────────────────────────────────────────────

async def scrape_company_jobs(careers_url: str, headless: bool = True) -> list[dict]:
    """Detect ATS type and scrape accordingly."""
    url_lower = careers_url.lower()

    try:
        if "greenhouse.io" in url_lower:
            jobs = await _scrape_greenhouse(careers_url)
        elif "lever.co" in url_lower:
            jobs = await _scrape_lever(careers_url)
        elif "ashbyhq.com" in url_lower:
            jobs = await _scrape_ashby(careers_url)
        elif "myworkdayjobs.com" in url_lower:
            jobs = await _scrape_workday(careers_url)
        else:
            jobs = await _scrape_playwright(careers_url, headless=headless)
    except Exception as exc:
        logger.error("scrape_company_jobs failed for %s: %s", careers_url, exc)
        jobs = []

    # Deduplicate by URL
    seen = set()
    unique = []
    for j in jobs:
        if j.get("url") and j["url"] not in seen:
            seen.add(j["url"])
            unique.append(j)

    logger.info("scrape_company_jobs → %d unique jobs from %s", len(unique), careers_url)
    return unique


# ── Greenhouse ─────────────────────────────────────────────────────────────

async def _scrape_greenhouse(url: str) -> list[dict]:
    """
    Greenhouse public API: boards-api.greenhouse.io/v1/boards/{slug}/jobs
    Works for both boards.greenhouse.io/{slug} and {company}.greenhouse.io
    """
    slug = _greenhouse_slug(url)
    if not slug:
        logger.warning("Could not extract Greenhouse slug from %s", url)
        return []

    api_url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=false"
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(api_url, headers=_HEADERS)
        if resp.status_code != 200:
            logger.warning("Greenhouse API %s returned %d", api_url, resp.status_code)
            return []
        data = resp.json()
        jobs = data.get("jobs", [])
        logger.info("Greenhouse API: %d jobs for slug=%s", len(jobs), slug)
        return [_gh_job(j) for j in jobs]
    except Exception as exc:
        logger.warning("Greenhouse API failed for %s: %s", url, exc)
        return []


def _greenhouse_slug(url: str) -> str | None:
    """Extract board slug from various Greenhouse URL formats."""
    patterns = [
        r"boards\.greenhouse\.io/([^/?#]+)",
        r"boards\.greenhouse\.io/embed/job_board\?for=([^&]+)",
        r"([^.]+)\.greenhouse\.io",
    ]
    for pat in patterns:
        m = re.search(pat, url, re.IGNORECASE)
        if m:
            return m.group(1).lower().strip()
    return None


def _gh_job(j: dict) -> dict:
    location = None
    if j.get("offices"):
        location = ", ".join(o.get("name", "") for o in j["offices"] if o.get("name"))
    elif j.get("location", {}).get("name"):
        location = j["location"]["name"]
    return {
        "id": str(uuid.uuid4()),
        "title": j.get("title", "Unknown"),
        "url": j.get("absolute_url", ""),
        "location": location or None,
        "description": None,
        "posted_at": None,
        "scraped_at": datetime.now(timezone.utc),
        "is_new": True,
    }


# ── Lever ──────────────────────────────────────────────────────────────────

async def _scrape_lever(url: str) -> list[dict]:
    """Lever public API: api.lever.co/v0/postings/{slug}?mode=json
    Falls back to Playwright if API returns 404."""
    slug = _lever_slug(url)
    if not slug:
        logger.warning("Could not extract Lever slug from %s", url)
        return await _scrape_playwright(url)

    api_url = f"https://api.lever.co/v0/postings/{slug}?mode=json&limit=500"
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(api_url, headers=_HEADERS)
        if resp.status_code == 404:
            logger.info("Lever API 404 for %s, trying Playwright", slug)
            return await _scrape_playwright(url)
        if resp.status_code != 200:
            logger.warning("Lever API %s returned %d", api_url, resp.status_code)
            return []
        jobs = resp.json()
        if not isinstance(jobs, list):
            jobs = jobs.get("data", [])
        logger.info("Lever API: %d jobs for slug=%s", len(jobs), slug)
        return [_lever_job(j) for j in jobs]
    except Exception as exc:
        logger.warning("Lever API failed for %s: %s", url, exc)
        return await _scrape_playwright(url)


def _lever_slug(url: str) -> str | None:
    m = re.search(r"jobs\.lever\.co/([^/?#]+)", url, re.IGNORECASE)
    return m.group(1).lower().strip() if m else None


def _lever_job(j: dict) -> dict:
    cats = j.get("categories", {})
    location = cats.get("location") or cats.get("allLocations", [None])[0]
    return {
        "id": str(uuid.uuid4()),
        "title": j.get("text", "Unknown"),
        "url": j.get("hostedUrl", j.get("applyUrl", "")),
        "location": location,
        "description": None,
        "posted_at": None,
        "scraped_at": datetime.now(timezone.utc),
        "is_new": True,
    }


# ── Ashby ──────────────────────────────────────────────────────────────────

async def _scrape_ashby(url: str) -> list[dict]:
    """Ashby public API."""
    slug = _ashby_slug(url)
    if not slug:
        return []

    api_url = f"https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams"
    payload = {
        "operationName": "ApiJobBoardWithTeams",
        "variables": {"organizationHostedJobsPageName": slug},
        "query": (
            "query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {"
            "  jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {"
            "    jobPostings { id title isListed locationName externalLink }"
            "  }"
            "}"
        ),
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(api_url, json=payload, headers={**_HEADERS, "Content-Type": "application/json"})
        data = resp.json()
        postings = (
            data.get("data", {})
            .get("jobBoard", {})
            .get("jobPostings", [])
        )
        return [
            {
                "id": str(uuid.uuid4()),
                "title": p.get("title", "Unknown"),
                "url": p.get("externalLink") or f"https://jobs.ashbyhq.com/{slug}/{p['id']}",
                "location": p.get("locationName"),
                "description": None,
                "posted_at": None,
                "scraped_at": datetime.now(timezone.utc),
                "is_new": True,
            }
            for p in postings
            if p.get("isListed", True)
        ]
    except Exception as exc:
        logger.warning("Ashby API failed for %s: %s", url, exc)
        return []


def _ashby_slug(url: str) -> str | None:
    m = re.search(r"jobs\.ashbyhq\.com/([^/?#]+)", url, re.IGNORECASE)
    return m.group(1).lower().strip() if m else None


# ── Workday ────────────────────────────────────────────────────────────────

async def _scrape_workday(url: str) -> list[dict]:
    """Workday internal search API."""
    m = re.search(r"(https?://[^/]+\.myworkdayjobs\.com)/([^/]+)/jobs", url, re.IGNORECASE)
    if not m:
        m = re.search(r"(https?://[^/]+\.myworkdayjobs\.com)/([^/?#]+)", url, re.IGNORECASE)
    if not m:
        return []

    base = m.group(1)
    tenant = m.group(2)
    api_url = f"{base}/wday/cxs/{tenant}/jobs/search"

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.post(
                api_url,
                json={"limit": 100, "offset": 0, "searchText": "", "appliedFacets": {}},
                headers={**_HEADERS, "Content-Type": "application/json"},
            )
        data = resp.json()
        jobs = data.get("jobPostings", [])
        logger.info("Workday: %d jobs from %s", len(jobs), url)
        return [
            {
                "id": str(uuid.uuid4()),
                "title": j.get("title", "Unknown"),
                "url": base + j.get("externalPath", ""),
                "location": j.get("locationsText"),
                "description": None,
                "posted_at": None,
                "scraped_at": datetime.now(timezone.utc),
                "is_new": True,
            }
            for j in jobs
        ]
    except Exception as exc:
        logger.warning("Workday API failed for %s: %s", url, exc)
        return []


# ── Playwright fallback ────────────────────────────────────────────────────

# Patterns that indicate a navigation link, not a job title
_NAV_PATTERNS = re.compile(
    r"^(jobs?|careers?|apply|home|search|back|next|previous|load more|view all|"
    r"sign in|log in|create account|work_outline|arrow_|chevron|menu|close|"
    r"filter|sort|reset|clear|submit|cancel)$",
    re.IGNORECASE,
)

_JOB_SELECTORS = [
    # Greenhouse embedded
    "div.opening a",
    # Lever
    "a.posting-title",
    # Workday
    "a[data-automation-id='jobTitle']",
    # Rippling
    "a[href*='/jobs/'] h3",
    "a[href*='/jobs/'] h4",
    # Generic patterns
    "[class*='job-title'] a",
    "[class*='position-title'] a",
    "[class*='jobTitle'] a",
    "[class*='job_title'] a",
    "li[class*='job'] a",
    "article[class*='job'] a",
    # iCIMS
    "a.iCIMS_Anchor",
    # SmartRecruiters
    "h4.job-title a",
    # BambooHR
    "li.ResJobList-item a",
    # JazzHR
    "a.apply-now",
]


async def _scrape_playwright(careers_url: str, headless: bool = True) -> list[dict]:
    jobs: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(user_agent=_HEADERS["User-Agent"])
        page = await context.new_page()

        try:
            await page.goto(careers_url, wait_until="networkidle", timeout=30_000)
            await page.wait_for_timeout(2000)

            for selector in _JOB_SELECTORS:
                elements = await page.query_selector_all(selector)
                if not elements:
                    continue

                found = []
                for el in elements[:150]:
                    title = (await el.inner_text()).strip()
                    href = await el.get_attribute("href") or ""

                    # Skip navigation/UI elements
                    if not title or len(title) < 5 or len(title) > 200:
                        continue
                    if _NAV_PATTERNS.match(title.strip()):
                        continue
                    if title.lower() in ("jobs", "careers", "apply now", "view jobs"):
                        continue

                    # Make URL absolute
                    if href.startswith("/"):
                        parsed = urlparse(careers_url)
                        href = f"{parsed.scheme}://{parsed.netloc}{href}"
                    elif not href.startswith("http"):
                        href = careers_url

                    location = await _find_location(el)
                    found.append({
                        "id": str(uuid.uuid4()),
                        "title": title,
                        "url": href,
                        "location": location,
                        "description": None,
                        "posted_at": None,
                        "scraped_at": datetime.now(timezone.utc),
                        "is_new": True,
                    })

                if found:
                    jobs = found
                    break

        except PWTimeout:
            logger.warning("Timeout scraping %s", careers_url)
        except Exception as exc:
            logger.error("Playwright error scraping %s: %s", careers_url, exc)
        finally:
            await browser.close()

    return jobs


async def _find_location(el) -> str | None:
    location_sels = [
        ".location", "[class*='location']",
        "[data-automation-id='locations']",
        "span.sort-by-location", "[class*='city']",
    ]
    for sel in location_sels:
        try:
            parent = await el.evaluate_handle(
                "el => el.closest('li, article, tr, div.job, div.opening, div.posting')"
            )
            loc_el = await parent.query_selector(sel)
            if loc_el:
                text = (await loc_el.inner_text()).strip()
                if text:
                    return text
        except Exception:
            pass
    return None
