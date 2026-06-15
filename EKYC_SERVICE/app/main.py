from fastapi import FastAPI

# Import kyc_router from its module (update the import path as needed)
from app.controller.kyc_controller import kyc_router

app = FastAPI(title="eKYC Service", version="0.1.0")
app.include_router(kyc_router)
