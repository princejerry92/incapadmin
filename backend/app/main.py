from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import sys

app = FastAPI(title="Blue Gold Investment Bank")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.routes.admin_auth import router as admin_auth_router
from app.routes.admin import router as admin_router
from app.routes.auth import router as auth_router
from app.routes.auto_withdrawal import router as auto_withdrawal_router
from app.routes.customer_care import router as customer_care_router
from app.routes.dashboard import router as dashboard_router
from app.routes.due_dates import router as due_dates_router
from app.routes.investors import router as investors_router
from app.routes.notifications import router as notifications_router
from app.routes.payment import router as payment_router
from app.routes.portfolio import router as portfolio_router
from app.routes.referral import router as referral_router
from app.routes.topup import router as topup_router
from app.routes.withdrawal import router as withdrawal_router

# Group all routers under versioned API prefix `/api/v1`
from fastapi import APIRouter

api_v1 = APIRouter(prefix="/api/v1")

api_v1.include_router(admin_auth_router)
api_v1.include_router(admin_router)
api_v1.include_router(auth_router)
api_v1.include_router(auto_withdrawal_router)
api_v1.include_router(customer_care_router)
api_v1.include_router(dashboard_router)
api_v1.include_router(due_dates_router)
api_v1.include_router(investors_router)
api_v1.include_router(notifications_router)
api_v1.include_router(payment_router)
api_v1.include_router(portfolio_router)
api_v1.include_router(referral_router)
api_v1.include_router(topup_router)
api_v1.include_router(withdrawal_router)

# Mount the versioned router on the app
app.include_router(api_v1)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Scheduler Events
from app.core.scheduler import start_scheduler, shutdown_scheduler

@app.on_event("startup")
async def startup_event():
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    shutdown_scheduler()

# Serve index.html at root
@app.get("/")
async def read_index():
    if getattr(sys, 'frozen', False):
        static_dir = os.path.join(sys._MEIPASS, 'static')
    else:
        static_dir = 'static'
        
    index_path = os.path.join(static_dir, 'index.html')
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"detail": "Not Found"}

# Mount static files, handling PyInstaller frozen state
from fastapi.staticfiles import StaticFiles

if getattr(sys, 'frozen', False):
    # Running in PyInstaller bundle
    static_dir = os.path.join(sys._MEIPASS, 'static')
else:
    # Running in development
    static_dir = 'static'

# Mount only if directory exists
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# SPA catch-all route - serves index.html for any non-API, non-static path
# This allows React Router to handle routes like /dashboard, /login, etc.
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """
    Catch-all route to serve index.html for SPA routing.
    This allows React Router to handle routes like /dashboard, /login, etc.
    """
    # Skip if it's an API route or static file request
    if full_path.startswith("api/") or full_path.startswith("static/"):
        return {"detail": "Not Found"}
    
    # Determine static directory
    if getattr(sys, 'frozen', False):
        static_path = os.path.join(sys._MEIPASS, 'static')
    else:
        static_path = 'static'
    
    index_path = os.path.join(static_path, 'index.html')
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"detail": "Not Found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)