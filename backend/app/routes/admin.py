"""
API routes for admin operations.
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional, Dict, Any, List
from ..services.transaction_service import TransactionService
from ..services.interest_calculation_service import InterestCalculationService
from ..core.security import verify_access_token

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/pending-withdrawals")
async def get_pending_withdrawals(
    authorization: Optional[str] = Header(None)
):
    """
    Get all pending withdrawal requests for admin approval.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Extract token from "Bearer <token>" format
    session_token = authorization
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")

    try:
        # Get user from session or verify admin JWT
        from ..services.dashboard import DashboardService
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)

        if not user:
            # If not a regular session, try to validate as admin JWT
            try:
                payload = verify_access_token(session_token)
                if payload.get('role') != 'admin':
                    raise HTTPException(status_code=401, detail="Invalid or expired session")
                user = {'is_admin': True, 'username': payload.get('sub')}
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid or expired session")

        # TODO: Add admin role check here
        # For now, assume any authenticated user can access admin functions

        # Get all pending withdrawals
        from ..core.config import settings
        import supabase
        supabase_client = supabase.create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

        response = supabase_client.table('transactions')\
            .select('*')\
            .in_('withdraw_status', ['pending', 'processing'])\
            .eq('transaction_type', 'withdrawal')\
            .order('created_at', desc=True)\
            .execute()

        transactions = getattr(response, 'data', [])

        # Get investor details for each withdrawal
        pending_withdrawals = []
        for transaction in transactions:
            investor_id = transaction.get('investor_id')
            if investor_id:
                investor_response = supabase_client.table('investors')\
                    .select('first_name, surname, email, account_number, bank_name, bank_account_name, bank_account_number')\
                    .eq('id', investor_id)\
                    .execute()

                investor_data = getattr(investor_response, 'data', [])
                if investor_data:
                    investor = investor_data[0]
                    withdrawal_info = {
                        'transaction_id': transaction.get('transaction_id'),
                        'investor_id': investor_id,
                        'investor_name': f"{investor.get('first_name', '')} {investor.get('surname', '')}",
                        'investor_email': investor.get('email'),
                        'account_number': investor.get('account_number'),
                        'bank_name': investor.get('bank_name'),
                        'bank_account_name': investor.get('bank_account_name'),
                        'bank_account_number': investor.get('bank_account_number'),
                        'amount': float(transaction.get('amount', 0)),
                        'created_at': transaction.get('created_at'),
                        'description': transaction.get('description', ''),
                        'status': transaction.get('withdraw_status', 'pending')
                    }
                    pending_withdrawals.append(withdrawal_info)

        return {
            'success': True,
            'pending_withdrawals': pending_withdrawals,
            'total_count': len(pending_withdrawals)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching pending withdrawals: {str(e)}")

@router.post("/approve-withdrawal/{transaction_id}")
async def approve_withdrawal(
    transaction_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Approve a pending withdrawal request.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Extract token from "Bearer <token>" format
    session_token = authorization
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")

    try:
        # Get user from session or verify admin JWT
        from ..services.dashboard import DashboardService
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)

        if not user:
            # If not a regular session, try to validate as admin JWT
            try:
                payload = verify_access_token(session_token)
                if payload.get('role') != 'admin':
                    raise HTTPException(status_code=401, detail="Invalid or expired session")
                user = {'is_admin': True, 'username': payload.get('sub')}
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid or expired session")

        # TODO: Add admin role check here

        # Approve the withdrawal (move to processing)
        transaction_service = TransactionService()
        result = transaction_service.update_withdrawal_status(transaction_id, 'processing')

        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])

        return {
            'success': True,
            'message': f'Withdrawal {transaction_id} approved and moved to processing',
            'transaction_id': transaction_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error approving withdrawal: {str(e)}")

@router.post("/pay-withdrawal/{transaction_id}")
async def pay_withdrawal(
    transaction_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Initiate Paystack payout for a withdrawal.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Extract token from "Bearer <token>" format
    session_token = authorization
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")

    try:
        # Get user from session or verify admin JWT
        from ..services.dashboard import DashboardService
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)

        if not user:
             # If not a regular session, try to validate as admin JWT
            try:
                payload = verify_access_token(session_token)
                if payload.get('role') != 'admin':
                    raise HTTPException(status_code=401, detail="Invalid or expired session")
                user = {'is_admin': True, 'username': payload.get('sub')}
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Process payout
        transaction_service = TransactionService()
        result = transaction_service.process_payout(transaction_id)

        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])

        return {
            'success': True,
            'message': f'Payout initiated for {transaction_id}',
            'data': result.get('data')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing payout: {str(e)}")

@router.post("/reject-withdrawal/{transaction_id}")
async def reject_withdrawal(
    transaction_id: str,
    rejection_reason: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Reject a pending withdrawal request.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Extract token from "Bearer <token>" format
    session_token = authorization
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")

    try:
        # Get user from session or verify admin JWT
        from ..services.dashboard import DashboardService
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)

        if not user:
            # If not a regular session, try to validate as admin JWT
            try:
                payload = verify_access_token(session_token)
                if payload.get('role') != 'admin':
                    raise HTTPException(status_code=401, detail="Invalid or expired session")
                user = {'is_admin': True, 'username': payload.get('sub')}
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid or expired session")

        # TODO: Add admin role check here

        # Reject the withdrawal
        transaction_service = TransactionService()
        result = transaction_service.update_withdrawal_status(
            transaction_id,
            'failed',
            rejection_reason or 'Rejected by admin'
        )

        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])

        return {
            'success': True,
            'message': f'Withdrawal {transaction_id} has been rejected',
            'transaction_id': transaction_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rejecting withdrawal: {str(e)}")

@router.post("/process-due-dates")
async def admin_process_due_dates(
    authorization: Optional[str] = Header(None)
):
    """
    Manually trigger due date processing for admin.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Extract token from "Bearer <token>" format
    session_token = authorization
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")

    try:
        # Get user from session or verify admin JWT
        from ..services.dashboard import DashboardService
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)

        if not user:
            # If not a regular session, try to validate as admin JWT
            try:
                payload = verify_access_token(session_token)
                if payload.get('role') != 'admin':
                    raise HTTPException(status_code=401, detail="Invalid or expired session")
                user = {'is_admin': True, 'username': payload.get('sub')}
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid or expired session")

        # TODO: Add admin role check here

        # Process due dates
        interest_service = InterestCalculationService()
        result = interest_service.check_and_process_due_dates()

        return {
            'success': result['success'],
            'processed_count': result.get('processed_count', 0),
            'errors': result.get('errors', [])
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing due dates: {str(e)}")

# --- New Admin Endpoints ---

@router.get("/investors")
async def get_all_investors(
    search: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Get all investors with due dates.
    """
    # TODO: Refactor auth check into a dependency
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        from ..services.admin_service import AdminService
        admin_service = AdminService()
        result = admin_service.get_all_investors(search_query=search)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result['error'])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payments")
async def get_payments_summary(
    search: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Get payments summary.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
        
    try:
        from ..services.admin_service import AdminService
        admin_service = AdminService()
        result = admin_service.get_payments_summary(search_query=search)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result['error'])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/portfolio")
async def get_portfolio_details(
    search: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Get portfolio details.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
        
    try:
        from ..services.admin_service import AdminService
        admin_service = AdminService()
        result = admin_service.get_portfolio_details(search_query=search)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result['error'])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/portfolio/{investor_id}")
async def update_investor_portfolio(
    investor_id: str,
    update_data: Dict[str, Any],
    authorization: Optional[str] = Header(None)
):
    """
    Update investor portfolio.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
        
    try:
        from ..services.admin_service import AdminService
        admin_service = AdminService()
        result = admin_service.update_investor_portfolio(investor_id, update_data)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customer-care")
async def get_customer_care_queries(
    search: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Get customer care queries.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
        
    try:
        from ..services.admin_service import AdminService
        admin_service = AdminService()
        result = admin_service.get_customer_care_queries(search_query=search)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result['error'])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/customer-care/{query_id}")
async def update_customer_care_query(
    query_id: str,
    status: str,
    admin_response: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    Update customer care query status.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
        
    try:
        from ..services.admin_service import AdminService
        admin_service = AdminService()
        result = admin_service.update_customer_care_query(query_id, status, admin_response)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_admin_config(
    authorization: Optional[str] = Header(None)
):
    """
    Get public config for admin frontend (Supabase URL/Key).
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
        
    try:
        from ..core.config import settings
        return {
            'success': True,
            'supabase_url': settings.SUPABASE_URL,
            'supabase_key': settings.SUPABASE_KEY
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Cron & Integrity Routes ---

@router.post("/cron/run-interest-payments")
async def trigger_interest_payments(
    authorization: Optional[str] = Header(None)
):
    """
    Manually trigger interest payment job.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        from ..services.admin_service import AdminService
        service = AdminService()
        result = service.trigger_interest_payment_job()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integrity/check")
async def check_integrity(
    authorization: Optional[str] = Header(None)
):
    """
    Check for data integrity issues.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.admin_service import AdminService
        service = AdminService()
        result = service.check_investment_data_integrity()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/integrity/fix/{investor_id}")
async def fix_integrity(
    investor_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Fix data integrity for a specific investor.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.admin_service import AdminService
        service = AdminService()
        result = service.fix_investor_data_integrity(investor_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/missed-payments-summary")
async def get_missed_payments_summary(
    authorization: Optional[str] = Header(None)
):
    """
    Get summary of investors with missed payments.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.admin_service import AdminService
        service = AdminService()
        result = service.get_missed_payments_summary()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/catch-up-missed-payments/{investor_id}")
async def catch_up_missed_payments(
    investor_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Manually trigger catch-up for missed payments for an investor.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.admin_service import AdminService
        service = AdminService()
        result = service.process_missed_payment_catchup(investor_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Server Events/Cards Management ---

@router.get("/server-events")
async def get_server_events(
    include_inactive: Optional[bool] = True,
    authorization: Optional[str] = Header(None)
):
    """
    Get all server events for admin management.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.server_events_service import ServerEventsService
        service = ServerEventsService()
        result = service.get_events_for_admin(include_inactive=include_inactive)

        if not result['success']:
            raise HTTPException(status_code=500, detail=result['error'])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching server events: {str(e)}")


@router.post("/server-events")
async def create_server_event(
    event_data: Dict[str, Any],
    authorization: Optional[str] = Header(None)
):
    """
    Create a new server event/card.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.server_events_service import ServerEventsService
        service = ServerEventsService()
        result = service.create_event(event_data)

        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating server event: {str(e)}")


@router.put("/server-events/{event_id}")
async def update_server_event(
    event_id: str,
    update_data: Dict[str, Any],
    authorization: Optional[str] = Header(None)
):
    """
    Update an existing server event/card.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.server_events_service import ServerEventsService
        service = ServerEventsService()
        result = service.update_event(event_id, update_data)

        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating server event: {str(e)}")


@router.delete("/server-events/{event_id}")
async def delete_server_event(
    event_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a server event (soft delete).
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.server_events_service import ServerEventsService
        service = ServerEventsService()
        result = service.delete_event(event_id)

        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting server event: {str(e)}")


@router.post("/clear-server-events-flag")
async def clear_server_events_flag(
    authorization: Optional[str] = Header(None)
):
    """
    Clear the server events update flag after client has refreshed.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    try:
        from ..services.server_events_service import ServerEventsService
        service = ServerEventsService()
        service.clear_events_update_flag()

        return {
            'success': True,
            'message': 'Server events update flag cleared'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing server events flag: {str(e)}")
