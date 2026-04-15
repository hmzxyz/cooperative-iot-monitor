from fastapi import APIRouter

from app.api.api_v1.endpoints import router as api_router

router = APIRouter()
router.include_router(api_router)
