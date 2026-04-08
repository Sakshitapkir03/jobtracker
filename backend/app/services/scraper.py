"""
Playwright-based job scraper.

Strategy:
  1. Navigate to the company's careers_url.
  2. Look for job listing elements using common CSS selectors / text patterns.
  3. Extract title, URL, and location for each posting.
  4. Return structured JobPosting data.
"""
import re
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from urllib.parse import quote_plus, unquote, urlparse

import httpx
from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout

logger = logging.getLogger(__name__)

# Common selectors used by popular ATS platforms
JOB_SELECTORS = [
    # Greenhouse
    "div.opening a",
    # Lever
    "a.posting-title",
    # Workday
    "a[data-automation-id='jobTitle']",
    # SmartRecruiters
    "article.js-job",
    # iCIMS / generic
    "a[href*='/jobs/']",
    "a[href*='/careers/']",
    "[class*='job-title'] a",
    "[class*='position'] a",
    "li.job a",
]

LOCATION_SELECTORS = [
    ".location",
    "[class*='location']",
    "[data-automation-id='locations']",
    "span.sort-by-location",
]


# Job boards / social sites — skip these when discovering a company's own careers page
_SKIP_DOMAINS = {
    "linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
    "monster.com", "simplyhired.com", "wellfound.com", "builtinnyc.com",
    "twitter.com", "x.com", "facebook.com", "instagram.com",
    "youtube.com", "wikipedia.org", "reddit.com",
}


async def find_careers_url(company_name: str) -> str | None:
    """
    Search DuckDuckGo for '{company_name} careers jobs' and return the first
    result URL that belongs to the company's own domain (not a job board).
    Saves the found URL back to the caller to avoid repeat searches.
    """
    query = quote_plus(f"{company_name} careers jobs")
    search_url = f"https://html.duckduckgo.com/html/?q={query}"
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(
                search_url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (X11; Linux x86_64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    )
                },
            )
        # DDG HTML encodes result links as uddg=<url-encoded-url>
        raw_matches = re.findall(r"uddg=(https?%3A%2F%2F[^&\"<\s]+)", resp.text)
        for encoded in raw_matches[:8]:
            url = unquote(encoded)
            netloc = urlparse(url).netloc.lower().lstrip("www.")
            if not any(skip in netloc for skip in _SKIP_DOMAINS):
                logger.info("Discovered careers URL for %s: %s", company_name, url)
                return url
    except Exception as exc:
        logger.warning("find_careers_url failed for %s: %s", company_name, exc)
    return None


async def scrape_company_jobs(
    careers_url: str,
    headless: bool = True,
) -> list[dict]:
    """Return a list of raw job dicts scraped from careers_url."""
    jobs: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        )
        page = await context.new_page()

        try:
            await page.goto(careers_url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_timeout(2000)  # Let JS render

            for selector in JOB_SELECTORS:
                elements = await page.query_selector_all(selector)
                if not elements:
                    continue

                for el in elements[:100]:  # cap per page
                    title = (await el.inner_text()).strip()
                    href = await el.get_attribute("href") or ""
                    if not title or len(title) < 3:
                        continue

                    # Make absolute URL
                    if href.startswith("/"):
                        from urllib.parse import urlparse
                        parsed = urlparse(careers_url)
                        href = f"{parsed.scheme}://{parsed.netloc}{href}"

                    # Try to find location sibling
                    location = await _find_location(el)

                    jobs.append({
                        "id": str(uuid.uuid4()),
                        "title": title,
                        "url": href or careers_url,
                        "location": location,
                        "scraped_at": datetime.now(timezone.utc),
                        "is_new": True,
                    })

                if jobs:
                    break  # found a working selector

        except PWTimeout:
            logger.warning("Timeout scraping %s", careers_url)
        except Exception as exc:
            logger.error("Error scraping %s: %s", careers_url, exc)
        finally:
            await browser.close()

    return jobs


async def _find_location(el) -> str | None:
    """Try to extract a location from near the job link element."""
    for sel in LOCATION_SELECTORS:
        try:
            parent = await el.evaluate_handle("el => el.closest('li, article, div.job, div.opening, tr')")
            loc_el = await parent.query_selector(sel)
            if loc_el:
                return (await loc_el.inner_text()).strip() or None
        except Exception:
            pass
    return None
