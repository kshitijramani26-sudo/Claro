"""Claro API — FastAPI app. Thin routers, fat services; asyncpg under the hood."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import close_pool, init_pool
from .errors import install_error_handlers
from .migrate import run_startup_migrations
from .routers import auth, analytics, bills, business, customers, home, inventory, khata, payment_methods, staff


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_pool()
    await run_startup_migrations()
    yield
    await close_pool()


app = FastAPI(title="Claro API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # mobile app; no cookies — bearer tokens only
    allow_methods=["*"],
    allow_headers=["*"],
)
install_error_handlers(app)

app.include_router(auth.router)
app.include_router(business.router)
app.include_router(payment_methods.router)
app.include_router(home.router)
app.include_router(inventory.router)
app.include_router(bills.router)
app.include_router(khata.router)
app.include_router(staff.router)
app.include_router(analytics.router)
app.include_router(customers.router)


@app.get("/health")
async def health() -> dict:
    return {"ok": True}
