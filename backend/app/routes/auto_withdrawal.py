"""
API routes for auto-withdrawal operations.
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from ..services.interest_calculation_service import InterestCalculationService

router = APIRouter(prefix="/auto-withdrawal", tags=["Auto Withdrawal"])

@router.post("/process-due-dates")
async def process_due_dates(
    authorization: Optional[str] = Header(None)
):
    """
    Process auto-withdrawals for all investors with due dates today.
    This endpoint should be called by a scheduled task/cron job.
    """
    # In a production environment, you would validate the authorization
    # For now, we'll allow the request to proceed
    try:
        interest_service = InterestCalculationService()
        result = interest_service.check_and_process_all_due_dates()
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result['error'])
        
        return {
            'success': True,
            'message': f'Processed {result["processed_count"]} auto-withdrawals',
            'errors': result['errors']
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing due dates: {str(e)}")