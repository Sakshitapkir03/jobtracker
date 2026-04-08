import logging
import uuid as uuid_lib
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import DEFAULT_USER_ID
from app.services.pdf_parser import parse_companies_from_pdf
from app.services.csv_parser import parse_companies_from_csv
from app.services.excel_parser import parse_companies_from_excel

logger = logging.getLogger(__name__)
router = APIRouter()

_BULK_BATCH = 500

_INSERT_SQL = text(
    "INSERT INTO companies (id, user_id, name, website, careers_url, industry, notes) "
    "VALUES (:id, :user_id, :name, :website, :careers_url, :industry, :notes)"
)


@router.post("/companies-pdf")
async def upload_companies_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "")

    is_csv = filename.endswith(".csv") or content_type.startswith("text/csv")
    is_pdf = filename.endswith(".pdf") or content_type == "application/pdf"
    is_excel = (
        filename.endswith(".xlsx") or filename.endswith(".xls")
        or content_type in {
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
    )

    if not (is_csv or is_pdf or is_excel):
        raise HTTPException(status_code=400, detail="Only PDF, CSV, or Excel files are supported")

    contents = await file.read()

    if is_csv:
        parsed = parse_companies_from_csv(contents)
    elif is_excel:
        parsed = parse_companies_from_excel(contents)
    else:
        parsed = parse_companies_from_pdf(contents)

    if not parsed:
        raise HTTPException(status_code=422, detail="No companies found in the file")

    logger.info("Parsed %d companies from %s", len(parsed), filename)

    rows = [
        {
            "id": str(uuid_lib.uuid4()),
            "user_id": DEFAULT_USER_ID,
            "name": d.get("name"),
            "website": d.get("website"),
            "careers_url": d.get("careers_url"),
            "industry": d.get("industry"),
            "notes": d.get("notes"),
        }
        for d in parsed
        if d.get("name")
    ]

    try:
        for i in range(0, len(rows), _BULK_BATCH):
            await db.execute(_INSERT_SQL, rows[i: i + _BULK_BATCH])
    except Exception as exc:
        logger.error("DB insert failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"DB insert failed: {exc}")

    logger.info("Inserted %d companies", len(rows))
    return {"imported": len(rows)}
