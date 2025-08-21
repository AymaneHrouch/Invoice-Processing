from contextlib import asynccontextmanager
import logging
import sys
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.utils.auth import create_admin_user
from app.database import close_database, init_database
from app.routes.health import router as health_router
from app.routes.invoices import router as invoices_router
from app.routes.dashboard import router as dashboard_router
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        init_database()  # PyMongo is synchronous
        create_admin_user()
    except Exception as e:
        pass

    yield

    # Shutdown
    try:
        close_database()
    except Exception as e:
        pass



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

    uvicorn.run(
        "app.main:app", host="localhost", port=8000, reload=True
    )