from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import configuration first to set environment variables
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import close_database, init_database
from app.routes.health import router as health_router
from app.routes.invoices import router as invoices_router
from app.logging_config import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup logging first
    logger = setup_logging()
    
    # Startup
    try:
        init_database()  # PyMongo is synchronous
        logger.info("Application startup complete")
    except Exception as e:
        logger.warning(f"Database initialization failed during startup: {e}")
        logger.info("Database will be initialized when first accessed")

    yield

    # Shutdown
    try:
        close_database()  # PyMongo is synchronous
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.warning(f"Error during shutdown: {e}")


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


@app.get("/")
async def root():
    return {"message": "Hello World"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app", host="localhost", port=8000, reload=True, log_level="info"
    )
