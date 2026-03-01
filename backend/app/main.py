from contextlib import asynccontextmanager
import logging
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import close_database, init_database
from app.logging_config import setup_logging
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.health import router as health_router
from app.routes.invoices import router as invoices_router
from app.routes.users import router as users_router
from app.utils.auth import create_admin_user

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("INVOICE PROCESSING API — Starting up …")
    logger.info("=" * 60)
    try:
        init_database()
        create_admin_user()
    except Exception as e:
        logger.exception("Failed during startup: %s", e)

    yield

    logger.info("Invoice Processing API shutting down.")
    try:
        close_database()
    except Exception as e:
        logger.exception("Failed during shutdown: %s", e)


app = FastAPI(
    title="Invoice Processing API",
    description="Invoice Processing API with MongoDB and PyMongo",
    version="1.0.0",
    root_path="/api",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Total-Count",
        "X-Total-Pages",
        "X-Per-Page",
        "X-Page",
        "X-Has-Next",
        "X-Has-Prev"
    ]
)


app.include_router(health_router)
app.include_router(invoices_router)
app.include_router(dashboard_router)
app.include_router(auth_router)
app.include_router(users_router)


@app.get("/")
async def root():
    return {"message": "Hello World"}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8888"))
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_config=None,
    )
