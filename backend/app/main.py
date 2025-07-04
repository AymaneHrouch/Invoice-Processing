from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routes.health import router as health_router
from app.routes.invoices import router as invoices_router
from app.database import init_database, close_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        init_database()  # PyMongo is synchronous
        print("Application startup complete")
    except Exception as e:
        print(f"Warning: Database initialization failed during startup: {e}")
        print("Database will be initialized when first accessed")
    
    yield
    
    # Shutdown
    try:
        close_database()  # PyMongo is synchronous
        print("Application shutdown complete")
    except Exception as e:
        print(f"Warning: Error during shutdown: {e}")


app = FastAPI(
    title="Invoice Processing API",
    description="Invoice Processing API with MongoDB and PyMongo",
    version="1.0.0",
    # root_path="/api",  # Comment this out to access docs at root level
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
