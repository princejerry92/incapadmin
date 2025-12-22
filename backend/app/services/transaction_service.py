# transaction_service.py
# ----------------------
# This module contains the business logic for transaction operations:
# - Records initial investment transactions from investors table
# - Records subsequent paystack transactions
# - Handles withdrawal requests and status updates
# - Provides transaction history and reporting

from typing import Optional, Dict, Any, List
from datetime import timedelta
from datetime import datetime, date
import uuid

from ..core.config import settings
from .notification_service import NotificationService
from .paystack_service import paystack_service


try:
    from supabase import create_client
except Exception:  # pragma: no cover - dev only
    create_client = None


class TransactionService:
    """Service for managing transaction records in Supabase.

    Usage:
      svc = TransactionService()
      # Record initial investment
      svc.record_initial_transaction(investor_data)
      # Record paystack transaction
      svc.record_paystack_transaction(transaction_data)
    """

    def __init__(self):
        self.supabase = None
        if create_client is None:
            raise RuntimeError("supabase package not installed. Install 'supabase' to use TransactionService")

        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise RuntimeError("Supabase config missing in settings")

        self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    def record_initial_transaction(self, investor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record the initial investment transaction when an investor is created.

        Args:
            investor_data: Dictionary containing investor information from investors table

        Returns:
            Dict with success status and data/error
        """
        try:
            transaction_record = {
                'email': investor_data['email'],
                'account_number': investor_data['account_number'],
                'initial_balance': investor_data.get('initial_investment', 0),
                'portfolio_type': investor_data.get('portfolio_type'),
                'investment_type': investor_data.get('investment_type'),
                'amount_due': 0,  # Initial investment has no due amount
                'last_due_date': None,
                'withdrawal_requested': False,
                'withdraw_status': 'none',
                'failure_reason': None,
                'transaction_id': f"INIT-{uuid.uuid4().hex[:12].upper()}",
                'paystack_ref': investor_data.get('paystack_reference'),
                'paystack_status': investor_data.get('payment_status', 'pending'),
                'transaction_type': 'initial',
                'amount': investor_data.get('initial_investment', 0),
                'withdrawal_timestamp': None,
                'paystack_timestamp': datetime.utcnow().isoformat() if investor_data.get('paystack_reference') else None,
                'investor_id': investor_data['id']
            }

            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            resp = self.supabase.table('transactions').insert(transaction_record).execute()

            data = None
            error = None
            if isinstance(resp, dict):
                data = resp.get('data')
                error = resp.get('error')
            else:
                data = getattr(resp, 'data', None)
                error = getattr(resp, 'error', None)

            if data:
                return {'success': True, 'data': data[0] if isinstance(data, list) else data}
            else:
                return {'success': False, 'error': f'Failed to insert transaction record: {error}'}

        except Exception as e:
            return {'success': False, 'error': f'Error recording initial transaction: {str(e)}'}

    def record_paystack_transaction(self, transaction_data: Dict[str, Any], investor_id: Optional[str] = None) -> Dict[str, Any]:
        """Record a paystack transaction (subsequent payments).

        Args:
            transaction_data: Paystack transaction data
            investor_id: Optional investor ID to link the transaction

        Returns:
            Dict with success status and data/error
        """
        try:
            # Extract relevant data from paystack transaction
            amount = transaction_data.get('amount', 0) / 100  # Convert from kobo to naira
            reference = transaction_data.get('reference')
            status = transaction_data.get('status', 'pending')
            email = transaction_data.get('customer', {}).get('email')
            paid_at = transaction_data.get('paid_at')

            # If investor_id not provided, try to find it from email
            if not investor_id and email:
                if self.supabase is None:
                    return {'success': False, 'error': 'Supabase client not initialized'}
                    
                investor_resp = self.supabase.table('investors').select('id, account_number, portfolio_type, investment_type').eq('email', email).execute()
                
                data = None
                error = None
                if isinstance(investor_resp, dict):
                    data = investor_resp.get('data')
                    error = investor_resp.get('error')
                else:
                    data = getattr(investor_resp, 'data', None)
                    error = getattr(investor_resp, 'error', None)
                
                if data and len(data) > 0:
                    investor = data[0]
                    investor_id = investor['id']
                    account_number = investor['account_number']
                    profile_type = investor['portfolio_type']
                    investment_type = investor.get('investment_type')
                else:
                    return {'success': False, 'error': f'Investor not found for email: {error}'}
            else:
                # Get investor details if investor_id is provided
                if self.supabase is None:
                    return {'success': False, 'error': 'Supabase client not initialized'}
                    
                investor_resp = self.supabase.table('investors').select('account_number, portfolio_type, investment_type, email').eq('id', investor_id).execute()
                
                data = None
                error = None
                if isinstance(investor_resp, dict):
                    data = investor_resp.get('data')
                    error = investor_resp.get('error')
                else:
                    data = getattr(investor_resp, 'data', None)
                    error = getattr(investor_resp, 'error', None)
                
                if data and len(data) > 0:
                    investor = data[0]
                    account_number = investor['account_number']
                    profile_type = investor['portfolio_type']
                    investment_type = investor.get('investment_type')
                    email = investor['email']
                else:
                    return {'success': False, 'error': f'Investor not found: {error}'}

            transaction_record = {
                'email': email,
                'account_number': account_number,
                'initial_balance': 0,  # Not applicable for subsequent transactions
                'profile_type': profile_type,
                'investment_type': investment_type,
                'amount_due': 0,  # Will be calculated based on business logic
                'last_due_date': None,
                'withdrawal_requested': False,
                'withdraw_status': 'none',
                'failure_reason': None,
                'transaction_id': f"PAY-{uuid.uuid4().hex[:12].upper()}",
                'paystack_ref': reference,
                'paystack_status': status,
                'transaction_type': 'payment',
                'amount': amount,
                'withdrawal_timestamp': None,
                'paystack_timestamp': datetime.fromisoformat(paid_at.replace('Z', '+00:00')).isoformat() if paid_at else datetime.utcnow().isoformat(),
                'investor_id': investor_id
            }

            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            resp = self.supabase.table('transactions').insert(transaction_record).execute()

            data = None
            error = None
            if isinstance(resp, dict):
                data = resp.get('data')
                error = resp.get('error')
            else:
                data = getattr(resp, 'data', None)
                error = getattr(resp, 'error', None)

            if data:
                return {'success': True, 'data': data[0] if isinstance(data, list) else data}
            else:
                return {'success': False, 'error': f'Failed to insert paystack transaction record: {error}'}

        except Exception as e:
            return {'success': False, 'error': f'Error recording paystack transaction: {str(e)}'}

    def record_withdrawal_request(self, withdrawal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a withdrawal request.

        Args:
            withdrawal_data: Dictionary containing withdrawal details

        Returns:
            Dict with success status and data/error
        """
        try:
            # Validate required fields
            required_fields = ['investor_id', 'amount', 'account_number']
            for field in required_fields:
                if field not in withdrawal_data:
                    return {'success': False, 'error': f'Missing required field: {field}'}

            investor_id = withdrawal_data['investor_id']
            amount = withdrawal_data['amount']

            # Get investor details including bank information
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}
                
            investor_resp = self.supabase.table('investors').select('email, portfolio_type, investment_type, bank_name, bank_account_name, bank_account_number').eq('id', investor_id).execute()
            
            data = None
            error = None
            if isinstance(investor_resp, dict):
                data = investor_resp.get('data')
                error = investor_resp.get('error')
            else:
                data = getattr(investor_resp, 'data', None)
                error = getattr(investor_resp, 'error', None)
            
            if not data or len(data) == 0:
                return {'success': False, 'error': f'Investor not found: {error}'}

            investor = data[0]

            transaction_record = {
                'email': investor['email'],
                'account_number': withdrawal_data['account_number'],
                'initial_balance': 0,
                'portfolio_type': investor['portfolio_type'],
                'investment_type': investor.get('investment_type'),
                'amount_due': amount,
                'last_due_date': date.today().isoformat(),
                'next_due_date': (date.today() + timedelta(days=7)).isoformat(),  # Set next due date to 1 week from now
                'withdrawal_requested': True,
                'withdraw_status': 'pending',
                'failure_reason': None,
                'transaction_id': f"WITHDRAW-{uuid.uuid4().hex[:12].upper()}",
                'paystack_ref': None,
                'paystack_status': None,
                'transaction_type': 'withdrawal',
                'amount': amount,
                'withdrawal_timestamp': datetime.utcnow().isoformat(),
                'paystack_timestamp': None,
                'investor_id': investor_id
            }

            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            resp = self.supabase.table('transactions').insert(transaction_record).execute()

            data = None
            error = None
            if isinstance(resp, dict):
                data = resp.get('data')
                error = resp.get('error')
            else:
                data = getattr(resp, 'data', None)
                error = getattr(resp, 'error', None)

            if data:
                # Generate notification for withdrawal request
                notification = NotificationService.generate_withdrawal_requested_notification(
                    investor_id=investor_id,
                    amount=amount
                )
                
                result_data = data[0] if isinstance(data, list) else data
                return {'success': True, 'data': result_data, 'notification': notification}
            else:
                return {'success': False, 'error': f'Failed to insert withdrawal transaction record: {error}'}

        except Exception as e:
            return {'success': False, 'error': f'Error recording withdrawal request: {str(e)}'}

    def process_payout(self, transaction_id: str) -> Dict[str, Any]:
        """Process a payout for a withdrawal via Paystack.

        Args:
            transaction_id: The transaction ID

        Returns:
            Dict with success status and data/error
        """
        try:
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            # Get transaction details
            tx_resp = self.supabase.table('transactions').select('*').eq('transaction_id', transaction_id).execute()
            
            tx_data = getattr(tx_resp, 'data', [])
            if not tx_data:
                return {'success': False, 'error': 'Transaction not found'}
            
            transaction = tx_data[0]
            
            # Verify status
            if transaction.get('withdraw_status') not in ['pending', 'processing']:
                return {'success': False, 'error': f"Invalid status for payout: {transaction.get('withdraw_status')}"}
                
            investor_id = transaction.get('investor_id')
            amount = float(transaction.get('amount', 0))
            
            # Get investor bank details
            inv_resp = self.supabase.table('investors').select('bank_name, bank_account_number, bank_account_name, email').eq('id', investor_id).execute()
            inv_data = getattr(inv_resp, 'data', [])
            if not inv_data:
                return {'success': False, 'error': 'Investor details not found'}
                
            investor = inv_data[0]
            bank_name = investor.get('bank_name')
            account_number = investor.get('bank_account_number')
            account_name = investor.get('bank_account_name')
            
            if not bank_name or not account_number:
                return {'success': False, 'error': 'Missing bank details for investor'}
                
            # 1. Resolve Bank Code
            bank_code = paystack_service.resolve_bank_code(bank_name)
            if not bank_code:
                return {'success': False, 'error': f"Could not resolve bank code for '{bank_name}'. Please verify bank name."}
                
            # 2. Create Transfer Recipient
            recipient_resp = paystack_service.create_transfer_recipient(
                name=account_name or "Investor",
                account_number=account_number,
                bank_code=bank_code
            )
            
            if not recipient_resp['status']:
                return {'success': False, 'error': f"Failed to create transfer recipient: {recipient_resp.get('message')}"}
                
            recipient_code = recipient_resp['data'].get('recipient_code')
            
            # 3. Initiate Transfer
            # Amount in kobo
            amount_kobo = int(amount * 100)
            reference = f"TRF-{uuid.uuid4().hex[:12].upper()}"
            
            transfer_resp = paystack_service.initiate_transfer(
                amount=amount_kobo,
                recipient_code=recipient_code,
                reason=f"Withdrawal for {transaction_id}",
                reference=reference
            )
            
            if not transfer_resp['status']:
                return {'success': False, 'error': f"Transfer initiation failed: {transfer_resp.get('message')}"}
                
            transfer_data = transfer_resp['data']
            paystack_ref = transfer_data.get('transfer_code') or transfer_data.get('reference') or reference
            
            # 4. Update Transaction
            # Update status to 'sent' and save reference
            result = self.update_withdrawal_status(transaction_id, 'sent')
            if not result['success']:
                return result
                
            # Also update the paystack_ref
            self.supabase.table('transactions').update({
                'paystack_ref': paystack_ref,
                'paystack_status': 'success' # Or 'pending' depending on if we want to wait for webhook
            }).eq('transaction_id', transaction_id).execute()
            
            return {
                'success': True,
                'message': 'Payout initiated successfully',
                'data': transfer_data
            }

        except Exception as e:
            return {'success': False, 'error': f'Error processing payout: {str(e)}'}

    def update_withdrawal_status(self, transaction_id: str, status: str, failure_reason: Optional[str] = None) -> Dict[str, Any]:
        """Update the status of a withdrawal transaction.

        Args:
            transaction_id: The transaction ID to update
            status: New status (pending, failed, sent)
            failure_reason: Reason for failure if status is 'failed'

        Returns:
            Dict with success status and data/error
        """
        try:
            update_data = {
                'withdraw_status': status,
                'updated_at': datetime.utcnow().isoformat()
            }

            if status == 'failed' and failure_reason:
                update_data['failure_reason'] = failure_reason

            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            # First, get the transaction details before updating
            transaction_resp = self.supabase.table('transactions').select('investor_id, amount, amount_due, transaction_type').eq('transaction_id', transaction_id).execute()
            
            transaction_data = None
            transaction_error = None
            if isinstance(transaction_resp, dict):
                transaction_data = transaction_resp.get('data')
                transaction_error = transaction_resp.get('error')
            else:
                transaction_data = getattr(transaction_resp, 'data', None)
                transaction_error = getattr(transaction_resp, 'error', None)
            
            if not transaction_data or len(transaction_data) == 0:
                return {'success': False, 'error': f'Transaction not found: {transaction_error}'}
            
            transaction = transaction_data[0]
            
            # If this is a withdrawal being marked as 'sent', update investor's amount_due and total_paid
            if status == 'sent' and transaction['transaction_type'] == 'withdrawal':
                investor_id = transaction['investor_id']
                withdrawal_amount = float(transaction['amount'])
                
                # Get current investor data
                investor_resp = self.supabase.table('investors').select('id').eq('id', investor_id).execute()
                
                investor_data = None
                investor_error = None
                if isinstance(investor_resp, dict):
                    investor_data = investor_resp.get('data')
                    investor_error = investor_resp.get('error')
                else:
                    investor_data = getattr(investor_resp, 'data', None)
                    investor_error = getattr(investor_resp, 'error', None)
                
                if investor_data and len(investor_data) > 0:
                    # Update the transaction with the sent status and withdrawal_amount
                    update_data['withdrawal_amount'] = str(withdrawal_amount)
                    resp = self.supabase.table('transactions').update(update_data).eq('transaction_id', transaction_id).execute()
                    
                    # Recalculate the investor's current amount_due after withdrawal
                    calc_result = self.calculate_amount_due(investor_id)
                    if calc_result['success']:
                        new_amount_due = calc_result['amount_due']
                        
                        # Update all transactions for this investor with the new calculated amount_due
                        transaction_update_data = {
                            'amount_due': new_amount_due,
                            'updated_at': datetime.utcnow().isoformat()
                        }
                        
                        transaction_update_resp = self.supabase.table('transactions').update(transaction_update_data).eq('investor_id', investor_id).execute()
                        
                        data = None
                        error = None
                        if isinstance(transaction_update_resp, dict):
                            data = transaction_update_resp.get('data')
                            error = transaction_update_resp.get('error')
                        else:
                            data = getattr(transaction_update_resp, 'data', None)
                            error = getattr(transaction_update_resp, 'error', None)
                        
                        if error:
                            return {'success': False, 'error': f'Failed to update investor transactions: {error}'}
                        
                        # Update the investor's total_paid field
                        investor_update_data = {
                            'updated_at': datetime.utcnow().isoformat()
                        }
                        
                        # Get current total_paid value and add the withdrawal amount
                        current_investor_resp = self.supabase.table('investors').select('total_paid').eq('id', investor_id).execute()
                        if isinstance(current_investor_resp, dict):
                            current_investor_data = current_investor_resp.get('data')
                        else:
                            current_investor_data = getattr(current_investor_resp, 'data', None)
                        
                        if current_investor_data and len(current_investor_data) > 0:
                            # Check if total_paid field exists
                            if 'total_paid' in current_investor_data[0]:
                                current_total_paid = float(current_investor_data[0].get('total_paid', 0) or 0)
                                new_total_paid = current_total_paid + withdrawal_amount
                                investor_update_data['total_paid'] = str(new_total_paid)
                            else:
                                # If total_paid field doesn't exist, set it to the withdrawal amount
                                investor_update_data['total_paid'] = str(withdrawal_amount)
                        
                        investor_update_resp = self.supabase.table('investors').update(investor_update_data).eq('id', investor_id).execute()

                        investor_update_data_result = None
                        investor_update_error = None
                        if isinstance(investor_update_resp, dict):
                            investor_update_data_result = investor_update_resp.get('data')
                            investor_update_error = investor_update_resp.get('error')
                        else:
                            investor_update_data_result = getattr(investor_update_resp, 'data', None)
                            investor_update_error = getattr(investor_update_resp, 'error', None)

                        if investor_update_error:
                            return {'success': False, 'error': f'Failed to update investor total_paid: {investor_update_error}'}

                        if investor_update_error:
                            return {'success': False, 'error': f'Failed to update investor total_paid: {investor_update_error}'}

                        # CRITICAL FIX: Removed double deduction.
                        # The amount is already deducted when the request is made (in withdrawal.py/InterestCalculationService).
                        # We do NOT need to deduct it again here.
                        
                        # from .interest_calculation_service import InterestCalculationService
                        # interest_service = InterestCalculationService()
                        # spending_update_result = interest_service.process_user_withdrawal(
                        #     investor_id,
                        #     withdrawal_amount
                        # )
                        # if not spending_update_result['success']:
                        #     return {'success': False, 'error': f'Failed to update spending account: {spending_update_result["error"]}'}
                    else:
                        return {'success': False, 'error': f'Failed to calculate new amount due: {calc_result.get("error")}'}
                else:
                    return {'success': False, 'error': f'Investor not found: {investor_error}'}
            else:
                # For other status updates, just update the transaction
                resp = self.supabase.table('transactions').update(update_data).eq('transaction_id', transaction_id).execute()

            data = None
            error = None
            if isinstance(resp, dict):
                data = resp.get('data')
                error = resp.get('error')
            else:
                data = getattr(resp, 'data', None)
                error = getattr(resp, 'error', None)

            if data:
                result = {'success': True, 'data': data[0] if isinstance(data, list) else data}

                # Generate notification for status update
                investor_id = transaction['investor_id']
                amount = transaction['amount']

                if status == 'sent':
                    result['notification'] = NotificationService.generate_withdrawal_completed_notification(
                        investor_id=investor_id,
                        amount=amount
                    )
                elif status == 'failed':
                    reason = failure_reason or "Unknown error"
                    result['notification'] = NotificationService.generate_withdrawal_failed_notification(
                        investor_id=investor_id,
                        amount=amount,
                        reason=reason
                    )

                return result
            else:
                return {'success': False, 'error': f'Failed to update withdrawal status: {error}'}

        except Exception as e:
            return {'success': False, 'error': f'Error updating withdrawal status: {str(e)}'}

    def get_transaction_history(self, investor_id: str, transaction_type: Optional[str] = None) -> Dict[str, Any]:
        """Get transaction history for an investor.

        Args:
            investor_id: The investor ID
            transaction_type: Optional filter by transaction type

        Returns:
            Dict with success status and transaction list/error
        """
        try:
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            query = self.supabase.table('transactions').select('*').eq('investor_id', investor_id)

            # Filter out deleted transactions
            # We check if is_deleted is FALSE or NULL (for backward compatibility)
            query = query.or_('is_deleted.eq.false,is_deleted.is.null')

            if transaction_type:
                query = query.eq('transaction_type', transaction_type)

            query = query.order('created_at', desc=True)

            resp = query.execute()

            data = None
            error = None
            if isinstance(resp, dict):
                data = resp.get('data')
                error = resp.get('error')
            else:
                data = getattr(resp, 'data', None)
                error = getattr(resp, 'error', None)

            if data is not None:
                # Normalize each transaction using helper so it includes canonical 'status' and 'description' keys
                normalized = [self._normalize_tx(dict(tx)) for tx in data]
                return {'success': True, 'data': normalized}
            else:
                return {'success': False, 'error': f'Failed to retrieve transaction history: {error}'}

        except Exception as e:
            return {'success': False, 'error': f'Error retrieving transaction history: {str(e)}'}

    def get_account_balance(self, account_number: str) -> Dict[str, Any]:
        """Calculate current balance for an account based on transactions.

        Args:
            account_number: The account number

        Returns:
            Dict with success status and balance/error
        """
        try:
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            # Get all transactions for the account
            resp = self.supabase.table('transactions').select('transaction_type, amount, withdraw_status, forfeiture_amount').eq('account_number', account_number).execute()

            data = None
            error = None
            if isinstance(resp, dict):
                data = resp.get('data')
                error = resp.get('error')
            else:
                data = getattr(resp, 'data', None)
                error = getattr(resp, 'error', None)

            if data is None:
                return {'success': False, 'error': f'Failed to retrieve transactions for balance calculation: {error}'}

            balance = 0
            for transaction in data:
                if transaction['transaction_type'] in ['initial', 'payment']:
                    balance += transaction['amount']
                elif transaction['transaction_type'] == 'withdrawal' and transaction['withdraw_status'] == 'sent':
                    balance -= transaction['amount']
                elif transaction['transaction_type'] == 'end_investment':
                    # For end investment, subtract the forfeiture amount and add the remaining to spending account
                    forfeiture_amount = float(transaction.get('forfeiture_amount', 0))
                    balance -= forfeiture_amount  # Subtract forfeiture
                    balance += (transaction['amount'] - forfeiture_amount)  # Add remaining to spending account

            return {'success': True, 'balance': balance}

        except Exception as e:
            return {'success': False, 'error': f'Error calculating account balance: {str(e)}'}

    def _normalize_tx(self, tx_copy: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a single transaction record for API consumers.

        Adds/normalizes:
        - status: unified status (prefers withdraw_status for withdrawals, paystack_status otherwise)
        - description: human-friendly description when missing
        """
        # Compute unified status
        status = tx_copy.get('status')
        if not status:
            if tx_copy.get('transaction_type') == 'withdrawal':
                status = tx_copy.get('withdraw_status') or tx_copy.get('paystack_status') or 'none'
            else:
                status = tx_copy.get('paystack_status') or tx_copy.get('withdraw_status') or 'none'

        tx_copy['status'] = status

        # Ensure description exists for frontend display
        if 'description' not in tx_copy or not tx_copy.get('description'):
            amount = tx_copy.get('amount') or tx_copy.get('withdrawal_amount') or tx_copy.get('initial_balance') or 0
            ttype = tx_copy.get('transaction_type', 'transaction')
            try:
                num_amount = float(amount)
            except Exception:
                num_amount = None

            if ttype == 'withdrawal':
                tx_copy['description'] = f'Withdrawal of ₦{num_amount:,.2f}' if num_amount is not None else 'Withdrawal'
            elif ttype in ('payment', 'topup'):
                tx_copy['description'] = f'{ttype.capitalize()} of ₦{num_amount:,.2f}' if num_amount is not None else ttype.capitalize()
            elif ttype == 'points_redemption':
                tx_copy['description'] = f'Points redemption added ₦{num_amount:,.2f}' if num_amount is not None else 'Points redemption'
            else:
                tx_copy['description'] = tx_copy.get('transaction_type', 'Transaction')

        return tx_copy

    def calculate_amount_due(self, investor_id: str) -> Dict[str, Any]:
        """Calculate the current amount due for an investor based on their investment.

        Args:
            investor_id: The investor ID

        Returns:
            Dict with success status and amount due/error
        """
        try:
            # Get investor details
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}
                
            investor_resp = self.supabase.table('investors').select('id, portfolio_type, investment_type, initial_investment, created_at').eq('id', investor_id).execute()
            
            data = None
            error = None
            if isinstance(investor_resp, dict):
                data = investor_resp.get('data')
                error = investor_resp.get('error')
            else:
                data = getattr(investor_resp, 'data', None)
                error = getattr(investor_resp, 'error', None)
            
            if not data or len(data) == 0:
                return {'success': False, 'error': f'Investor not found: {error}'}

            investor = data[0]
            portfolio_type = investor.get('portfolio_type')
            investment_type = investor.get('investment_type')
            initial_investment = float(investor.get('initial_investment', 0))

            # If no investment type set, no amount due
            if not investment_type:
                return {'success': True, 'amount_due': 0}

            # Import portfolio service to get investment rules
            from .portfolio_service import PortfolioService
            portfolio_service = PortfolioService()

            # Get investment requirements
            requirements = portfolio_service.get_investment_requirements(portfolio_type, investment_type)
            if not requirements:
                return {'success': False, 'error': f'Invalid investment type {investment_type} for portfolio {portfolio_type}'}

            # Calculate weeks elapsed since investment start
            created_at = investor.get('created_at')
            if isinstance(created_at, str):
                start_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            else:
                start_date = created_at

            weeks_elapsed = (datetime.now(start_date.tzinfo) - start_date).days // 7

            # Calculate amount due based on weekly interest
            weekly_rate = requirements["weekly_interest_rate"] / 100
            weekly_interest = initial_investment * weekly_rate
            amount_due = weekly_interest * weeks_elapsed

            return {'success': True, 'amount_due': amount_due, 'weeks_elapsed': weeks_elapsed}

        except Exception as e:
            return {'success': False, 'error': f'Error calculating amount due: {str(e)}'}

    def update_transaction_amounts(self, investor_id: str, investment_type: str) -> Dict[str, Any]:
        """Update existing transactions with calculated amounts based on investment type.

        Args:
            investor_id: The investor ID
            investment_type: The newly selected investment type

        Returns:
            Dict with success status and update result/error
        """
        try:
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}
            
            # Get investor details to get portfolio type and other info
            investor_resp = self.supabase.table('investors').select('portfolio_type, initial_investment, created_at').eq('id', investor_id).execute()
            
            data = None
            error = None
            if isinstance(investor_resp, dict):
                data = investor_resp.get('data')
                error = investor_resp.get('error')
            else:
                data = getattr(investor_resp, 'data', None)
                error = getattr(investor_resp, 'error', None)
            
            if not data or len(data) == 0:
                return {'success': False, 'error': f'Investor not found: {error}'}

            investor = data[0]
            portfolio_type = investor.get('portfolio_type')
            initial_investment = float(investor.get('initial_investment', 0))
            
            # Import portfolio service to get investment rules
            from .portfolio_service import PortfolioService
            portfolio_service = PortfolioService()
            
            # Get investment requirements
            requirements = portfolio_service.get_investment_requirements(portfolio_type, investment_type)
            if not requirements:
                return {'success': False, 'error': f'Invalid investment type {investment_type} for portfolio {portfolio_type}'}
            
            # Calculate weeks elapsed since investment start
            created_at = investor.get('created_at')
            if isinstance(created_at, str):
                start_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            else:
                start_date = created_at

            weeks_elapsed = (datetime.now(start_date.tzinfo) - start_date).days // 7
            
            # Calculate amount due based on weekly interest
            weekly_rate = requirements["weekly_interest_rate"] / 100
            weekly_interest = initial_investment * weekly_rate
            amount_due = weekly_interest * weeks_elapsed
            
            # Update all transactions for this investor with the new investment type and calculated amount
            update_data = {
                'investment_type': investment_type,
                'amount_due': amount_due,
                'portfolio_type': portfolio_type,  # Correct field name
                'updated_at': datetime.now().isoformat()
            }
            
            # Update all transactions for this investor
            update_resp = self.supabase.table('transactions').update(update_data).eq('investor_id', investor_id).execute()
            
            update_data_result = None
            update_error = None
            if isinstance(update_resp, dict):
                update_data_result = update_resp.get('data')
                update_error = update_resp.get('error')
            else:
                update_data_result = getattr(update_resp, 'data', None)
                update_error = getattr(update_resp, 'error', None)
            
            if update_error:
                return {'success': False, 'error': f'Failed to update transactions: {update_error}'}
            
            return {
                'success': True,
                'message': f'Transactions updated with investment type {investment_type} and amount due {amount_due}',
                'amount_due': amount_due,
                'weeks_elapsed': weeks_elapsed
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Error updating transaction amounts: {str(e)}'}

    def end_investment(self, investor_id: str) -> Dict[str, Any]:
        """End investment and transfer 75% of initial deposit to spending account.

        Args:
            investor_id: The investor ID

        Returns:
            Dict with success status and result/error
        """
        try:
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}
            
            # Get investor details
            investor_resp = self.supabase.table('investors').select('id, email, initial_investment, portfolio_type, investment_type, account_number').eq('id', investor_id).execute()
            
            data = None
            error = None
            if isinstance(investor_resp, dict):
                data = investor_resp.get('data')
                error = investor_resp.get('error')
            else:
                data = getattr(investor_resp, 'data', None)
                error = getattr(investor_resp, 'error', None)
            
            if not data or len(data) == 0:
                return {'success': False, 'error': f'Investor not found: {error}'}

            investor = data[0]
            initial_investment = float(investor.get('initial_investment', 0))
            
            # Calculate forfeiture (25%) and remaining amount (75%)
            forfeiture_amount = initial_investment * 0.25
            remaining_amount = initial_investment - forfeiture_amount
            
            # Update investor record to mark as ended
            update_data = {
                'investment_ended': True,
                'ended_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            update_resp = self.supabase.table('investors').update(update_data).eq('id', investor_id).execute()
            
            update_data_result = None
            update_error = None
            if isinstance(update_resp, dict):
                update_data_result = update_resp.get('data')
                update_error = update_resp.get('error')
            else:
                update_data_result = getattr(update_resp, 'data', None)
                update_error = getattr(update_resp, 'error', None)
            
            if update_error:
                return {'success': False, 'error': f'Failed to update investor record: {update_error}'}
            
            # Record the end investment transaction
            transaction_record = {
                'email': investor['email'],
                'account_number': investor['account_number'],
                'initial_balance': initial_investment,
                'portfolio_type': investor['portfolio_type'],
                'investment_type': investor.get('investment_type'),
                'amount_due': remaining_amount,  # Amount going to spending account
                'last_due_date': date.today().isoformat(),
                'next_due_date': None,
                'withdrawal_requested': False,
                'withdraw_status': 'completed',  # Mark as completed since it's going to spending account
                'failure_reason': None,
                'transaction_id': f"END-{uuid.uuid4().hex[:12].upper()}",
                'paystack_ref': None,
                'paystack_status': 'completed',
                'transaction_type': 'end_investment',
                'amount': initial_investment,
                'forfeiture_amount': forfeiture_amount,
                'withdrawal_timestamp': datetime.now().isoformat(),
                'paystack_timestamp': datetime.now().isoformat(),
                'investor_id': investor_id
            }

            transaction_resp = self.supabase.table('transactions').insert(transaction_record).execute()

            transaction_data = None
            transaction_error = None
            if isinstance(transaction_resp, dict):
                transaction_data = transaction_resp.get('data')
                transaction_error = transaction_resp.get('error')
            else:
                transaction_data = getattr(transaction_resp, 'data', None)
                transaction_error = getattr(transaction_resp, 'error', None)
            
            if transaction_error:
                return {'success': False, 'error': f'Failed to record end investment transaction: {transaction_error}'}
            
            return {'success': True, 'data': transaction_data}
            
        except Exception as e:
            return {'success': False, 'error': f'Error ending investment: {str(e)}'}

    def delete_transaction(self, transaction_id: str, investor_id: str) -> Dict[str, Any]:
        """Soft delete a transaction by marking it as deleted.

        Args:
            transaction_id: The transaction ID
            investor_id: The investor ID (for security verification)

        Returns:
            Dict with success status
        """
        try:
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            # Verify transaction belongs to investor
            check_resp = self.supabase.table('transactions').select('id').eq('transaction_id', transaction_id).eq('investor_id', investor_id).execute()
            
            data = None
            if isinstance(check_resp, dict):
                data = check_resp.get('data')
            else:
                data = getattr(check_resp, 'data', None)
            
            if not data:
                return {'success': False, 'error': 'Transaction not found or access denied'}

            # Perform soft delete (update is_deleted flag)
            # Note: This assumes an 'is_deleted' column exists. 
            # If not, we might need to add it or use a different strategy.
            update_data = {
                'is_deleted': True,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            resp = self.supabase.table('transactions').update(update_data).eq('transaction_id', transaction_id).execute()

            error = None
            if isinstance(resp, dict):
                error = resp.get('error')
            else:
                error = getattr(resp, 'error', None)

            if error:
                return {'success': False, 'error': f'Failed to delete transaction: {error}'}

            return {'success': True, 'message': 'Transaction deleted successfully'}

        except Exception as e:
            return {'success': False, 'error': f'Error deleting transaction: {str(e)}'}

            transaction_error = None
            if isinstance(transaction_resp, dict):
                transaction_data = transaction_resp.get('data')
                transaction_error = transaction_resp.get('error')
            else:
                transaction_data = getattr(transaction_resp, 'data', None)
                transaction_error = getattr(transaction_resp, 'error', None)

            if transaction_error:
                return {'success': False, 'error': f'Failed to insert end investment transaction record: {transaction_error}'}
            
            result = {
                'success': True,
                'message': f'Investment ended successfully. {remaining_amount} transferred to spending account.',
                'forfeiture_amount': forfeiture_amount,
                'remaining_amount': remaining_amount
            }

            # Generate notification for investment ended and persist it
            notification = NotificationService.generate_investment_ended_notification(
                investor_id=investor_id,
                returned_amount=remaining_amount
            )
            
            # Persist the notification in the database
            try:
                from .notification_persistence_service import NotificationPersistenceService
                notification_service = NotificationPersistenceService()
                notification_service.create_notification(
                    investor_id=investor_id,
                    title=notification['title'],
                    message=notification['message'],
                    notification_type=notification['type'],
                    event_type=notification['eventType'],
                    metadata=notification.get('metadata')
                )
            except Exception as persist_error:
                print(f"Failed to persist notification: {persist_error}")
            
            result['notification'] = notification

            return result
            
        except Exception as e:
            return {'success': False, 'error': f'Error ending investment: {str(e)}'}

    def renew_investment(self, investor_id: str) -> Dict[str, Any]:
        """Renew investment by clearing records but keeping initial deposits.
        Takes 20% of initial investment as service fee.

        Args:
            investor_id: The investor ID

        Returns:
            Dict with success status and result/error
        """
        try:
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}
            
            # Get investor details
            investor_resp = self.supabase.table('investors').select('id, email, initial_investment, portfolio_type, investment_type, account_number').eq('id', investor_id).execute()
            
            data = None
            error = None
            if isinstance(investor_resp, dict):
                data = investor_resp.get('data')
                error = investor_resp.get('error')
            else:
                data = getattr(investor_resp, 'data', None)
                error = getattr(investor_resp, 'error', None)
            
            if not data or len(data) == 0:
                return {'success': False, 'error': f'Investor not found: {error}'}

            investor = data[0]
            initial_investment = float(investor.get('initial_investment', 0))
            
            # Calculate service fee (20% of initial investment)
            service_fee = initial_investment * 0.20
            remaining_amount = initial_investment - service_fee
            
            # Update investor record to reset investment details but keep initial deposit
            update_data = {
                'initial_investment': remaining_amount,  # Reduce initial investment by service fee
                'total_investment': remaining_amount,    # Also update total_investment
                'investment_type': None,  # Reset investment type
                'investment_started': False,  # Reset investment started flag
                'investment_ended': False,  # Reset investment ended flag
                'payment_counter': 0,  # CRITICAL: Reset counter for new cycle
                'current_week': 0,    # Reset week tracking
                'total_paid': 0,      # Reset total paid for new cycle
                'investment_start_date': None,  # Will be set on new investment selection
                'last_due_date': None,
                'next_due_date': None,
                'investment_expiry_date': None,
                'created_at': datetime.now().isoformat(),  # Reset creation date
                'updated_at': datetime.now().isoformat()
            }
            
            update_resp = self.supabase.table('investors').update(update_data).eq('id', investor_id).execute()
            
            update_data_result = None
            update_error = None
            if isinstance(update_resp, dict):
                update_data_result = update_resp.get('data')
                update_error = update_resp.get('error')
            else:
                update_data_result = getattr(update_resp, 'data', None)
                update_error = getattr(update_resp, 'error', None)
            
            if update_error:
                return {'success': False, 'error': f'Failed to update investor record: {update_error}'}
            
            # Record the renew investment transaction
            transaction_record = {
                'email': investor['email'],
                'account_number': investor['account_number'],
                'initial_balance': initial_investment,
                'portfolio_type': investor['portfolio_type'],
                'investment_type': investor.get('investment_type'),
                'amount_due': 0,
                'last_due_date': date.today().isoformat(),
                'next_due_date': None,
                'withdrawal_requested': False,
                'withdraw_status': 'none',
                'failure_reason': None,
                'transaction_id': f"RENEW-{uuid.uuid4().hex[:12].upper()}",
                'paystack_ref': None,
                'paystack_status': 'completed',
                'transaction_type': 'renew_investment',
                'amount': remaining_amount,  # Amount available for new investment
                'service_fee': service_fee,  # Record the service fee taken
                'withdrawal_timestamp': datetime.now().isoformat(),
                'paystack_timestamp': datetime.now().isoformat(),
                'investor_id': investor_id
            }

            transaction_resp = self.supabase.table('transactions').insert(transaction_record).execute()

            transaction_data = None
            transaction_error = None
            if isinstance(transaction_resp, dict):
                transaction_data = transaction_resp.get('data')
                transaction_error = transaction_resp.get('error')
            else:
                transaction_data = getattr(transaction_resp, 'data', None)
                transaction_error = getattr(transaction_resp, 'error', None)

            if transaction_error:
                return {'success': False, 'error': f'Failed to insert renew investment transaction record: {transaction_error}'}
            
            result = {
                'success': True,
                'message': f'Investment renewed successfully. Service fee of {service_fee} deducted. You can now select a new investment type.',
                'service_fee': service_fee,
                'remaining_amount': remaining_amount
            }

            # Generate notification for investment renewed and persist it
            notification = NotificationService.generate_investment_renewed_notification(
                investor_id=investor_id
            )
            
            # Persist the notification in the database
            try:
                from .notification_persistence_service import NotificationPersistenceService
                notification_service = NotificationPersistenceService()
                notification_service.create_notification(
                    investor_id=investor_id,
                    title=notification['title'],
                    message=notification['message'],
                    notification_type=notification['type'],
                    event_type=notification['eventType'],
                    metadata=notification.get('metadata')
                )
            except Exception as persist_error:
                print(f"Failed to persist notification: {persist_error}")
            
            result['notification'] = notification

            return result
            
        except Exception as e:
            return {'success': False, 'error': f'Error renewing investment: {str(e)}'}

    def record_points_redemption_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a points redemption transaction that adds funds to spending account.

        Args:
            transaction_data: Dictionary containing redemption details

        Returns:
            Dict with success status and data/error
        """
        try:
            # Validate required fields
            required_fields = ['investor_id', 'amount']
            for field in required_fields:
                if field not in transaction_data:
                    return {'success': False, 'error': f'Missing required field: {field}'}

            investor_id = transaction_data['investor_id']
            amount = transaction_data['amount']
            description = transaction_data.get('description', f'Points redemption: ₦{amount:,} added to spending account')

            # Get investor details
            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            investor_resp = self.supabase.table('investors').select('email, account_number, portfolio_type, investment_type').eq('id', investor_id).execute()

            data = None
            error = None
            if isinstance(investor_resp, dict):
                data = investor_resp.get('data')
                error = investor_resp.get('error')
            else:
                data = getattr(investor_resp, 'data', None)
                error = getattr(investor_resp, 'error', None)

            if not data or len(data) == 0:
                return {'success': False, 'error': f'Investor not found: {error}'}

            investor = data[0]

            transaction_record = {
                'email': investor['email'],
                'account_number': investor['account_number'],
                'initial_balance': 0,
                'portfolio_type': investor['portfolio_type'],
                'investment_type': investor.get('investment_type'),
                'amount_due': -amount,  # Negative amount_due to indicate credit to spending account
                'last_due_date': date.today().isoformat(),
                'withdrawal_requested': False,
                'withdraw_status': 'completed',
                'failure_reason': None,
                'transaction_id': f"REDEEM-{uuid.uuid4().hex[:12].upper()}",
                'paystack_ref': None,
                'paystack_status': 'completed',
                'transaction_type': 'points_redemption',
                'amount': amount,
                'withdrawal_amount': str(amount),  # Store the cash amount here
                'withdrawal_timestamp': datetime.now().isoformat(),
                'paystack_timestamp': datetime.now().isoformat(),
                'investor_id': investor_id
            }

            if self.supabase is None:
                return {'success': False, 'error': 'Supabase client not initialized'}

            resp = self.supabase.table('transactions').insert(transaction_record).execute()

            data = None
            error = None
            if isinstance(resp, dict):
                data = resp.get('data')
                error = resp.get('error')
            else:
                data = getattr(resp, 'data', None)
                error = getattr(resp, 'error', None)

            if data:
                return {'success': True, 'data': data[0] if isinstance(data, list) else data}
            else:
                return {'success': False, 'error': f'Failed to record points redemption transaction: {error}'}

        except Exception as e:
            return {'success': False, 'error': f'Error recording points redemption transaction: {str(e)}'}
