import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.alert import Alert
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertOut

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.user_id == current_user.id).order_by(Alert.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=AlertOut, status_code=201)
async def create_alert(
    data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(Alert).where(
            Alert.user_id == current_user.id,
            Alert.role_keyword == data.role_keyword.strip(),
            Alert.is_active == True,
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="Alert for this keyword already exists")
    alert = Alert(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        role_keyword=data.role_keyword.strip(),
    )
    db.add(alert)
    await db.flush()
    return alert


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = await db.get(Alert, alert_id)
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
