import logging

from app.services.exchange_rate import get_exchange_rate
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
from datetime import  datetime

router = APIRouter(prefix="/exchange-rates", tags=["Exchange Rates"])

# =============Exchange Rate Endpoint ===================
@router.get("")
def get_rates(date:datetime):
    try:
        data = get_exchange_rate(date)
        data["_id"] = str(data["_id"])
        return data

    except ValueError as e:
        logger.exception(e)
        raise HTTPException(status_code=404, detail="Exchange rate is not available for the specified date.")
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail="An error occurred while fetching exchange rates.")
