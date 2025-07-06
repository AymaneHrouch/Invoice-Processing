from fastapi import APIRouter, HTTPException

from app.crud.invoice import InvoiceCRUD

router = APIRouter()


@router.get("/health")
def health_check():
    """Health check endpoint that also tests database connectivity"""
    try:
        # Test database connection by counting invoices
        count = InvoiceCRUD.count_invoices()
        return {
            "status": "ok",
            "database": "connected",
            "invoices_count": count
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "database": "disconnected",
                "error": str(e)
            }
        )
