from fastapi import APIRouter
from app.api.v1 import companies, applications, jobs, notifications, upload, scraper

api_router = APIRouter()

api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(scraper.router, prefix="/scraper", tags=["scraper"])
