import uuid
from math import ceil
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import DEFAULT_USER_ID
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate, PaginatedCompanies

router = APIRouter()


@router.get("", response_model=PaginatedCompanies)
async def list_companies(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Company)
    if search:
        q = q.where(Company.name.ilike(f"%{search}%"))
    q = q.order_by(Company.name)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    items = (await db.scalars(q.offset((page - 1) * size).limit(size))).all()

    return PaginatedCompanies(
        items=items, total=total, page=page, size=size,
        pages=ceil(total / size) if total else 1,
    )


@router.get("/{company_id}", response_model=CompanyOut)
async def get_company(company_id: str, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.post("", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
async def create_company(data: CompanyCreate, db: AsyncSession = Depends(get_db)):
    company = Company(id=str(uuid.uuid4()), user_id=DEFAULT_USER_ID, **data.model_dump())
    db.add(company)
    await db.flush()
    return company


@router.patch("/{company_id}", response_model=CompanyOut)
async def update_company(
    company_id: str, data: CompanyUpdate, db: AsyncSession = Depends(get_db)
):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(company_id: str, db: AsyncSession = Depends(get_db)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    await db.delete(company)
