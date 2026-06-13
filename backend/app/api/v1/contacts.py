from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.contact import Contact
from app.models.user import User
from app.schemas.contact import ContactOut, ContactWithCompanyOut
from app.services import apollo_service

router = APIRouter()


@router.get("", response_model=list[ContactWithCompanyOut])
async def list_all_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contact, Company.name.label("company_name"))
        .join(Company, Contact.company_id == Company.id)
        .where(Contact.user_id == current_user.id)
        .order_by(Company.name, Contact.name)
    )
    return [
        ContactWithCompanyOut(
            id=c.id,
            user_id=c.user_id,
            company_id=c.company_id,
            name=c.name,
            title=c.title,
            email=c.email,
            linkedin_url=c.linkedin_url,
            created_at=c.created_at,
            company_name=company_name,
        )
        for c, company_name in result.all()
    ]


@router.get("/{company_id}", response_model=list[ContactOut])
async def list_contacts(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = await db.scalar(select(Company).where(Company.id == company_id, Company.user_id == current_user.id))
    if not company:
        raise HTTPException(404, "Company not found")
    rows = await db.scalars(select(Contact).where(Contact.company_id == company_id, Contact.user_id == current_user.id))
    return list(rows)


@router.post("/{company_id}/search", response_model=list[ContactOut])
async def search_contacts(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = await db.scalar(select(Company).where(Company.id == company_id, Company.user_id == current_user.id))
    if not company:
        raise HTTPException(404, "Company not found")

    # Delete old results for this company before refreshing
    await db.execute(delete(Contact).where(Contact.company_id == company_id, Contact.user_id == current_user.id))

    people = await apollo_service.search_contacts(company.name, company.website)

    saved = []
    for p in people:
        contact = Contact(user_id=current_user.id, company_id=company_id, **p)
        db.add(contact)
        saved.append(contact)

    await db.flush()
    return saved
