import uuid
from math import ceil
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import DEFAULT_USER_ID
from app.models.application import Application, ApplicationStage
from app.schemas.application import (
    ApplicationCreate, ApplicationOut, ApplicationUpdate, PaginatedApplications,
)

router = APIRouter()


@router.get("", response_model=PaginatedApplications)
async def list_applications(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    stage: ApplicationStage | None = None,
    company_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Application)
        .options(selectinload(Application.company))
        .order_by(Application.applied_at.desc())
    )
    if stage:
        q = q.where(Application.stage == stage)
    if company_id:
        q = q.where(Application.company_id == company_id)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    items = (await db.scalars(q.offset((page - 1) * size).limit(size))).all()

    return PaginatedApplications(
        items=items, total=total, page=page, size=size,
        pages=ceil(total / size) if total else 1,
    )


@router.get("/{app_id}", response_model=ApplicationOut)
async def get_application(app_id: str, db: AsyncSession = Depends(get_db)):
    app = await db.scalar(
        select(Application)
        .options(selectinload(Application.company))
        .where(Application.id == app_id)
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def create_application(data: ApplicationCreate, db: AsyncSession = Depends(get_db)):
    app = Application(
        id=str(uuid.uuid4()),
        user_id=DEFAULT_USER_ID,
        updated_at=datetime.now(timezone.utc),
        **data.model_dump(),
    )
    db.add(app)
    await db.flush()
    await db.refresh(app, ["company"])
    return app


@router.patch("/{app_id}", response_model=ApplicationOut)
async def update_application(
    app_id: str, data: ApplicationUpdate, db: AsyncSession = Depends(get_db)
):
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    app.updated_at = datetime.now(timezone.utc)
    return app


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(app_id: str, db: AsyncSession = Depends(get_db)):
    app = await db.get(Application, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    await db.delete(app)
