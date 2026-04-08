"""Send transactional emails via Resend."""
import logging
import resend
from app.config import settings

logger = logging.getLogger(__name__)

resend.api_key = settings.resend_api_key


def send_new_jobs_email(
    to_email: str,
    company_name: str,
    jobs: list[dict],
) -> bool:
    """Send a digest email for new job openings at a company."""
    if not jobs:
        return False

    job_rows = "".join(
        f"""
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">
            <a href="{j['url']}" style="color:#2563eb;font-weight:600">{j['title']}</a>
            <br><span style="color:#6b7280;font-size:13px">{j.get('location') or 'Location not specified'}</span>
          </td>
        </tr>"""
        for j in jobs[:20]
    )

    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
      <h2 style="color:#111827">New openings at {company_name}</h2>
      <p style="color:#6b7280">
        {len(jobs)} new job posting{'s' if len(jobs) != 1 else ''} found today.
      </p>
      <table style="width:100%;border-collapse:collapse">{job_rows}</table>
      <p style="margin-top:24px;color:#9ca3af;font-size:12px">
        You're receiving this because you track {company_name} in Job Tracker.
      </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to_email],
            "subject": f"{len(jobs)} new job{'s' if len(jobs) != 1 else ''} at {company_name}",
            "html": html,
        })
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False
