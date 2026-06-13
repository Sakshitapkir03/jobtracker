from fastapi import APIRouter
from app.api.v1 import companies, applications, jobs, notifications, upload, scraper, alerts, contacts
from app.api.v1 import auth

api_router = APIRouter()

# Auth (no /api/v1 prefix — mounted at /auth)
auth_router = APIRouter()
auth_router.include_router(auth.router, prefix="/auth", tags=["auth"])

api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(scraper.router, prefix="/scraper", tags=["scraper"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
