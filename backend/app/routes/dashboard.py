"""
API routes for dashboard operations.
"""

from fastapi import APIRouter, HTTPException, Header, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from pydantic import BaseModel
from ..services.dashboard import DashboardService
from ..services.transaction_service import TransactionService
from ..utils.pdf_generator import PDFGenerator

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class InvestmentActionRequest(BaseModel):
    investor_id: str


class UpdateProfileRequest(BaseModel):
    phone_number: Optional[str] = None
    address: Optional[str] = None
    profile_pic: Optional[str] = None


@router.get("/data")
async def get_dashboard_data(authorization: Optional[str] = Header(None)):
    """
    Get dashboard data for authenticated user.
    Requires session token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>" format
    session_token = authorization
    if authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    try:
        service = DashboardService()
        result = service.get_dashboard_data(session_token)
        
        if not result.get('success'):
            raise HTTPException(status_code=401, detail=result.get('error', 'Authentication failed'))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard data: {str(e)}")


@router.post("/update-profile")
async def update_user_profile(
    request: UpdateProfileRequest, 
    authorization: Optional[str] = Header(None)
):
    """
    Update user profile information.
    Requires session token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization
    if authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    try:
        service = DashboardService()
        user = service.get_user_by_session(session_token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Prepare update data
        update_data = {}
        if request.phone_number is not None:
            update_data['phone_number'] = request.phone_number
        if request.address is not None:
            update_data['address'] = request.address
        if request.profile_pic is not None:
            update_data['profile_pic'] = request.profile_pic
            
        # Update user profile
        result = service.update_user_profile(user['id'], update_data)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")


@router.get("/user")
async def get_user_info(authorization: Optional[str] = Header(None)):
    """
    Get current user information.
    Requires session token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization
    if authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    try:
        service = DashboardService()
        user = service.get_user_by_session(session_token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        return {
            'success': True,
            'user': {
                'id': user.get('id'),
                'email': user.get('email'),
                'first_name': user.get('first_name', ''),
                'surname': user.get('surname', ''),
                'full_name': f"{user.get('first_name', '')} {user.get('surname', '')}".strip(),
                'profile_pic': user.get('profile_pic', ''),
                'phone_number': user.get('phone_number', ''),
                'address': user.get('address', ''),
                'last_login': user.get('last_login')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user info: {str(e)}")


@router.get("/investments")
async def get_user_investments(authorization: Optional[str] = Header(None)):
    """
    Get all investments for authenticated user.
    Requires session token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization
    if authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    try:
        service = DashboardService()
        user = service.get_user_by_session(session_token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Fetch investor data for the user
        investor_response = service.supabase.table('investors').select('*').eq('email', user['email']).execute()
        investor_data = getattr(investor_response, 'data', [])
        
        investment_data = service.get_user_investments(user['email'], investor_data)
        
        return {
            'success': True,
            'data': investment_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching investments: {str(e)}")


@router.get("/transactions")
async def get_transaction_history(authorization: Optional[str] = Header(None), limit: int = 20):
    """
    Get transaction history for authenticated user.
    Requires session token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization
    if authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    try:
        # Get user from session
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Get user's investor ID
        investor_service = dashboard_service.supabase.table('investors').select('id').eq('email', user['email']).execute()
        investor_data = getattr(investor_service, 'data', [])
        
        if not investor_data:
            return {
                'success': True,
                'data': []
            }
        
        investor_id = investor_data[0]['id']
        
        # Get transaction history
        transaction_service = TransactionService()
        transactions_result = transaction_service.get_transaction_history(investor_id)
        
        if transactions_result['success']:
            return {
                'success': True,
                'data': transactions_result['data'][:limit]  # Limit results
            }
        else:
            return {
                'success': False,
                'error': transactions_result['error']
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transaction history: {str(e)}")


@router.post("/end-investment")
async def end_investment(request: InvestmentActionRequest, authorization: Optional[str] = Header(None)):
    """
    End investment and transfer 75% of initial deposit to spending account.
    Requires session token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization
    if authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    try:
        # Get user from session
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Verify investor belongs to user
        investor_service = dashboard_service.supabase.table('investors').select('email').eq('id', request.investor_id).execute()
        investor_data = getattr(investor_service, 'data', [])
        
        if not investor_data or investor_data[0]['email'] != user['email']:
            raise HTTPException(status_code=403, detail="Investor does not belong to user")
        
        # End investment using TransactionService
        transaction_service = TransactionService()
        result = transaction_service.end_investment(request.investor_id)
        
        if result['success']:
            return {
                'success': True,
                'message': 'Investment ended successfully'
            }
        else:
            raise HTTPException(status_code=500, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ending investment: {str(e)}")


@router.post("/renew-investment")
async def renew_investment(request: InvestmentActionRequest, authorization: Optional[str] = Header(None)):
    """
    Renew investment by clearing records but keeping initial deposits.
    Requires session token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization
    if authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    try:
        # Get user from session
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Verify investor belongs to user
        investor_service = dashboard_service.supabase.table('investors').select('email').eq('id', request.investor_id).execute()
        investor_data = getattr(investor_service, 'data', [])
        
        if not investor_data or investor_data[0]['email'] != user['email']:
            raise HTTPException(status_code=403, detail="Investor does not belong to user")
        
        # Renew investment using TransactionService
        transaction_service = TransactionService()
        result = transaction_service.renew_investment(request.investor_id)
        
        if result['success']:
            return {
                'success': True,
                'message': 'Investment renewed successfully'
            }
        else:
            raise HTTPException(status_code=500, detail=result['error'])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error renewing investment: {str(e)}")


class DeleteTransactionRequest(BaseModel):
    transaction_id: str


@router.post("/delete-transaction")
async def delete_transaction(request: DeleteTransactionRequest, authorization: Optional[str] = Header(None)):
    """
    Delete (soft delete) a transaction.
    Requires session token in Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization
    if authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    try:
        # Get user from session
        dashboard_service = DashboardService()
        user = dashboard_service.get_user_by_session(session_token)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        # Get user's investor ID
        investor_service = dashboard_service.supabase.table('investors').select('id').eq('email', user['email']).execute()
        investor_data = getattr(investor_service, 'data', [])
        
        if not investor_data:
            raise HTTPException(status_code=404, detail="Investor profile not found")
            
        investor_id = investor_data[0]['id']
        
        # Delete transaction using TransactionService
        transaction_service = TransactionService()
        result = transaction_service.delete_transaction(request.transaction_id, investor_id)
        
        if result['success']:
            return {
                'success': True,
                'message': 'Transaction deleted successfully'
            }
        else:
            raise HTTPException(status_code=500, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting transaction: {str(e)}")


@router.get("/export/receipt/{transaction_id}")
async def export_transaction_receipt(transaction_id: str, authorization: Optional[str] = Header(None)):
    """
    Export a single transaction receipt as PDF.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    try:
        service = DashboardService()
        user = service.get_user_by_session(session_token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid session")
            
        # Get transaction
        tx_service = TransactionService()
        # Verify investor belongs to user
        investor_resp = service.supabase.table('investors').select('id, account_number').eq('email', user['email']).execute()
        investor_data = getattr(investor_resp, 'data', [])
        if not investor_data:
            raise HTTPException(status_code=404, detail="Investor not found")
        
        investor_id = investor_data[0]['id']
        tx_result = tx_service.get_transaction_by_id(transaction_id, investor_id)
        
        if not tx_result['success']:
            raise HTTPException(status_code=404, detail="Transaction not found or access denied")
        
        # Add account number to user info for PDF
        user_info = {**user, 'account_number': investor_data[0]['account_number']}
        
        # Generate PDF
        pdf_gen = PDFGenerator()
        pdf_buffer = pdf_gen.generate_receipt(tx_result['data'], user_info)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=receipt_{transaction_id}.pdf"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")



@router.get("/export/history")
async def export_transaction_history(authorization: Optional[str] = Header(None)):
    """
    Export all transaction history as PDF.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    session_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    try:
        service = DashboardService()
        user = service.get_user_by_session(session_token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid session")
            
        # Get investor info
        investor_resp = service.supabase.table('investors').select('id, account_number').eq('email', user['email']).execute()
        investor_data = getattr(investor_resp, 'data', [])
        if not investor_data:
            raise HTTPException(status_code=404, detail="Investor not found")
            
        investor_id = investor_data[0]['id']
        
        # Get all transactions
        tx_service = TransactionService()
        tx_result = tx_service.get_transaction_history(investor_id)
        
        if not tx_result['success']:
            raise HTTPException(status_code=500, detail="Failed to fetch transactions")
        
        # Add account number to user info for PDF
        user_info = {**user, 'account_number': investor_data[0]['account_number']}
        
        # Generate PDF
        pdf_gen = PDFGenerator()
        pdf_buffer = pdf_gen.generate_history_report(tx_result['data'], user_info)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=transaction_history.pdf"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

