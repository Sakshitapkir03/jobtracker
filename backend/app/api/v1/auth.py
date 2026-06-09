import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenOut

_logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == data.email.lower()))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = User(
        email=data.email.lower(),
        full_name=data.full_name,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.flush()
    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Google OAuth ─────────────────────────────────────────────────────────────

@router.get("/google")
async def google_login():
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    params = (
        f"client_id={settings.google_client_id}"
        f"&redirect_uri={settings.backend_url.rstrip('/')}/auth/google/callback"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": f"{settings.backend_url.rstrip('/')}/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            _logger.error("Google token exchange failed status=%s body=%r redirect_uri=%s/auth/google/callback", token_resp.status_code, token_resp.text, settings.backend_url)
            raise HTTPException(status_code=400, detail=f"Google token error: {token_resp.text}")
        access_token = token_resp.json()["access_token"]
        user_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_resp.raise_for_status()
        info = user_resp.json()

    user = await _get_or_create_oauth_user(
        db, email=info["email"], name=info.get("name"), avatar=info.get("picture"),
        provider="google", oauth_id=info["id"],
    )
    jwt = create_access_token({"sub": user.id, "email": user.email})
    return RedirectResponse(f"{settings.frontend_url.rstrip('/')}/auth/callback?token={jwt}")


# ── GitHub OAuth ─────────────────────────────────────────────────────────────

@router.get("/github")
async def github_login():
    if not settings.github_client_id:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
    params = (
        f"client_id={settings.github_client_id}"
        f"&redirect_uri={settings.backend_url.rstrip('/')}/auth/github/callback"
        f"&scope=read:user%20user:email"
    )
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@router.get("/github/callback")
async def github_callback(code: str, db: AsyncSession = Depends(get_db)):
    if not settings.github_client_id:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": f"{settings.backend_url.rstrip('/')}/auth/github/callback",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"},
        )
        user_resp.raise_for_status()
        info = user_resp.json()
        email = info.get("email")
        if not email:
            email_resp = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            emails = email_resp.json()
            primary = next((e["email"] for e in emails if e.get("primary") and e.get("verified")), None)
            email = primary or emails[0]["email"] if emails else None
        if not email:
            raise HTTPException(status_code=400, detail="No email found in GitHub account")

    user = await _get_or_create_oauth_user(
        db, email=email, name=info.get("name") or info.get("login"),
        avatar=info.get("avatar_url"), provider="github", oauth_id=str(info["id"]),
    )
    jwt = create_access_token({"sub": user.id, "email": user.email})
    return RedirectResponse(f"{settings.frontend_url.rstrip('/')}/auth/callback?token={jwt}")


# ── helpers ──────────────────────────────────────────────────────────────────

async def _get_or_create_oauth_user(
    db: AsyncSession, *, email: str, name: str | None, avatar: str | None,
    provider: str, oauth_id: str,
) -> User:
    user = await db.scalar(select(User).where(User.email == email.lower()))
    if user:
        user.oauth_provider = provider
        user.oauth_id = oauth_id
        if avatar and not user.avatar_url:
            user.avatar_url = avatar
        return user
    user = User(
        email=email.lower(), full_name=name, avatar_url=avatar,
        oauth_provider=provider, oauth_id=oauth_id,
    )
    db.add(user)
    await db.flush()
    return user
