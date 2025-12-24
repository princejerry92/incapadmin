"""
Interest Calculation Service for managing interest calculations and database updates.
Handles interest calculation based on investment start date, portfolio type, and investment type.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta, date
from ..core.config import settings

try:
    from supabase import create_client
except Exception:
    create_client = None


class InterestCalculationService:
    """Service for calculating interest and managing database updates for investors."""

    def __init__(self):
        if create_client is None:
            raise RuntimeError("supabase package not installed")

        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise RuntimeError("Supabase config missing in settings")

        self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    def calculate_weekly_interest(self, portfolio_type: str, investment_type: str, balance: float) -> Optional[float]:
        """Calculate weekly interest amount for an investment."""
        # Import portfolio service to get investment rules
        from .portfolio_service import PortfolioService
        portfolio_service = PortfolioService()
        
        requirements = portfolio_service.get_investment_requirements(portfolio_type, investment_type)
        
        if not requirements:
            return None
        
        # Calculate weekly interest amount
        weekly_rate = requirements["weekly_interest_rate"] / 100
        weekly_interest = balance * weekly_rate
        return weekly_interest

    def get_investor_spending_account(self, investor_id: str) -> Dict[str, Any]:
        """Get or create spending account for an investor."""
        try:
            # Check if spending account exists
            response = self.supabase.table('spending_accounts').select('*').eq('investor_id', investor_id).execute()
            data = getattr(response, 'data', [])
            
            if data:
                return {
                    'success': True,
                    'account': data[0]
                }
            
            # Create new spending account if it doesn't exist
            new_account = {
                'investor_id': investor_id,
                'balance': 0,
                'total_withdrawn': 0
            }
            
            create_response = self.supabase.table('spending_accounts').insert(new_account).execute()
            create_data = getattr(create_response, 'data', [])
            
            if create_data:
                return {
                    'success': True,
                    'account': create_data[0]
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to create spending account'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error getting/creating spending account: {str(e)}'
            }

    def calculate_current_interest(self, investor_id: str) -> Dict[str, Any]:
        """Calculate current interest for an investor based on their investment start date.
        Uses total_investment (initial + all top-ups) for unified balance and interest calculation.
        """
        try:
            # Get investor details
            investor_response = self.supabase.table('investors').select('*').eq('id', investor_id).execute()
            investor_data = getattr(investor_response, 'data', [])

            if not investor_data:
                return {
                    'success': False,
                    'error': 'Investor not found'
                }

            investor = investor_data[0]
            portfolio_type = investor.get('portfolio_type')
            investment_type = investor.get('investment_type')
            # Fallback to initial_investment if total_investment is 0 or missing (Fix for legacy data)
            total_investment = float(investor.get('total_investment', 0) or investor.get('initial_investment', 0) or 0)
            investment_start_date = investor.get('investment_start_date')

            # If no investment type or start date or zero total investment, no interest
            if not investment_type or not investment_start_date or total_investment <= 0:
                return {
                    'success': True,
                    'interest_amount': 0,
                    'weeks_elapsed': 0
                }

            # Parse investment start date
            if isinstance(investment_start_date, str):
                start_date = datetime.fromisoformat(investment_start_date.replace('Z', '+00:00'))
            else:
                start_date = investment_start_date

            # Calculate weeks elapsed since investment start
            weeks_elapsed = (datetime.now(start_date.tzinfo) - start_date).days // 7

            # Calculate current week's interest using total investment amount (unified balance)
            weekly_interest = self.calculate_weekly_interest(portfolio_type, investment_type, total_investment)

            if weekly_interest is None:
                return {
                    'success': False,
                    'error': 'Failed to calculate weekly interest'
                }

            return {
                'success': True,
                'interest_amount': weekly_interest,
                'weeks_elapsed': weeks_elapsed,
                'investment_start_date': investment_start_date,
                'total_investment': total_investment,
                'payment_counter': int(investor.get('payment_counter', 0) or 0)
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Error calculating current interest: {str(e)}'
            }

    def calculate_missed_payments(self, investor_id: str) -> Dict[str, Any]:
        """
        Calculate number of missed payments based on weeks elapsed vs payment counter.
        """
        try:
            interest_result = self.calculate_current_interest(investor_id)
            if not interest_result['success']:
                return interest_result
            
            weeks_elapsed = interest_result['weeks_elapsed']
            payment_counter = interest_result.get('payment_counter', 0)
            
            # weeks_elapsed is total full weeks passed.
            # payment_counter is total payments made.
            # Missed = weeks_elapsed - payment_counter
            # If Result < 0, it means overpayment (should alert)
            
            missed_count = weeks_elapsed - payment_counter
            
            return {
                'success': True,
                'weeks_elapsed': weeks_elapsed,
                'payment_counter': payment_counter,
                'missed_payments': missed_count,
                'data': interest_result
            }
            
        except Exception as e:
            return {'success': False, 'error': f"Error calculating missed payments: {str(e)}"}

    def update_spending_account(self, investor_id: str, interest_amount: float) -> Dict[str, Any]:
        """Add interest to investor's spending account."""
        try:
            # Get or create spending account
            account_result = self.get_investor_spending_account(investor_id)
            if not account_result['success']:
                return account_result
            
            account = account_result['account']
            current_balance = float(account.get('balance', 0))
            new_balance = current_balance + interest_amount
            
            # Update spending account balance
            update_data = {
                'balance': new_balance,
                'updated_at': datetime.now().isoformat()
            }
            
            update_response = self.supabase.table('spending_accounts').update(update_data).eq('id', account['id']).execute()
            update_data_result = getattr(update_response, 'data', [])
            
            if update_data_result:
                return {
                    'success': True,
                    'new_balance': new_balance,
                    'interest_added': interest_amount
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to update spending account'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Error updating spending account: {str(e)}'
            }

    def _update_next_due_date(self, investor_id: str) -> bool:
        """
        Update the next_due_date to next week.
        Logic:
        - The payment was just made for 'next_due_date'.
        - So 'last_due_date' becomes the old 'next_due_date'.
        - New 'next_due_date' becomes old 'next_due_date' + 7 days.
        """
        try:
            # Get investor data
            investor_response = self.supabase.table('investors').select('next_due_date, current_week, investment_expiry_date, portfolio_type, investment_type, investment_start_date, created_at').eq('id', investor_id).execute()
            investor_data = getattr(investor_response, 'data', [])

            if not investor_data:
                return False

            investor = investor_data[0]
            current_next_due_date = investor.get('next_due_date')
            current_week = int(investor.get('current_week', 0))
            investment_expiry_date = investor.get('investment_expiry_date')

            if not current_next_due_date:
                # Should not happen if we just paid, but handle gracefully
                return False

            # Parse current due date (which was just paid)
            if isinstance(current_next_due_date, str):
                just_paid_date_obj = datetime.fromisoformat(current_next_due_date.replace('Z', '+00:00'))
            else:
                just_paid_date_obj = current_next_due_date

            # Calculate new dates
            new_last_due_date_obj = just_paid_date_obj
            new_next_due_date_obj = just_paid_date_obj + timedelta(days=7)
            new_current_week = current_week + 1

            # Calculate expiry date dynamically
            portfolio_type = investor.get('portfolio_type')
            investment_type = investor.get('investment_type')
            start_date_val = investor.get('investment_start_date') or investor.get('created_at')
            
            if portfolio_type and investment_type and start_date_val:
                from .portfolio_service import PortfolioService
                portfolio_service = PortfolioService()
                
                if isinstance(start_date_val, str):
                    start_date_obj = datetime.fromisoformat(start_date_val.replace('Z', '+00:00'))
                else:
                    start_date_obj = start_date_val
                    
                expiry_date_obj = portfolio_service.get_investment_expiry_date(portfolio_type, investment_type, start_date_obj)
                
                if expiry_date_obj:
                     # Ensure both are timezone-aware or both naive for comparison
                    if new_next_due_date_obj.tzinfo is not None and expiry_date_obj.tzinfo is None:
                        expiry_date_obj = expiry_date_obj.replace(tzinfo=new_next_due_date_obj.tzinfo)
                    elif new_next_due_date_obj.tzinfo is None and expiry_date_obj.tzinfo is not None:
                        new_next_due_date_obj = new_next_due_date_obj.replace(tzinfo=expiry_date_obj.tzinfo)

                     # If new next due date is past expiry, set to None
                    if new_next_due_date_obj > expiry_date_obj:
                        new_next_due_date_obj = None
            
            update_data = {
                'last_due_date': new_last_due_date_obj.isoformat(),
                'next_due_date': new_next_due_date_obj.isoformat() if new_next_due_date_obj else None,
                'current_week': new_current_week,
                'updated_at': datetime.now().isoformat()
            }
            
            # If finished
            if new_next_due_date_obj is None:
                # Removed investment_status update as column does not exist
                pass

            update_response = self.supabase.table('investors').update(update_data).eq('id', investor_id).execute()
            update_data_result = getattr(update_response, 'data', [])

            return bool(update_data_result)

        except Exception as e:
            print(f"Error updating next_due_date for investor {investor_id}: {str(e)}")
            return False

    def process_auto_withdrawal(self, investor_id: str) -> Dict[str, Any]:
        """Process auto-withdrawal of interest to spending account on due date."""
        try:
            # 0. IDEMPOTENCY CHECK
            # Check if we already paid interest today for this investor
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            existing_tx = self.supabase.table('transactions')\
                .select('id')\
                .eq('investor_id', investor_id)\
                .eq('transaction_type', 'interest_deposit')\
                .gte('created_at', today_start)\
                .execute()
            
            if getattr(existing_tx, 'data', []):
                 return {
                    'success': True,
                    'message': 'Interest already paid today',
                    'paid': False # Important: indicate we didn't pay *now*, but it's done
                }

            # Calculate current interest
            interest_result = self.calculate_current_interest(investor_id)
            if not interest_result['success']:
                return interest_result
            
            interest_amount = interest_result['interest_amount']
            weeks_elapsed = interest_result['weeks_elapsed']
            payment_counter = interest_result.get('payment_counter', 0)
            
            # CHECK: Only pay if we are due for the NEXT payment
            # i.e., weeks_elapsed should be greater than payment_counter
            # If weeks_elapsed == payment_counter, we are up to date.
            if weeks_elapsed <= payment_counter:
                 return {
                    'success': True,
                    'message': 'Payment not yet due based on counter',
                    'paid': False,
                    'debug': f"Weeks: {weeks_elapsed}, Counter: {payment_counter}"
                }

            if interest_amount <= 0:
                return {
                    'success': True,
                    'message': 'No interest to withdraw'
                }
            
            # Add interest to spending account
            update_result = self.update_spending_account(investor_id, interest_amount)
            if not update_result['success']:
                return update_result
            
            # Update investor's total_paid
            investor_response = self.supabase.table('investors').select('total_paid, email, account_number, portfolio_type, investment_type').eq('id', investor_id).execute()
            investor_data = getattr(investor_response, 'data', [])
            
            if investor_data:
                investor = investor_data[0]
                current_total_paid = float(investor.get('total_paid', 0) or 0)
                new_total_paid = current_total_paid + interest_amount
                
                new_total_paid = current_total_paid + interest_amount
                
                # Update investor record with new total_paid AND increment payment_counter
                new_counter = payment_counter + 1
                
                investor_update_data = {
                    'total_paid': new_total_paid,
                    'payment_counter': new_counter,
                    'updated_at': datetime.now().isoformat()
                }
                
                self.supabase.table('investors').update(investor_update_data).eq('id', investor_id).execute()
                
                # Record transaction
                import uuid
                transaction_data = {
                    'investor_id': investor_id,
                    'amount': interest_amount,
                    'transaction_type': 'interest_deposit',
                    'transaction_id': f"INT-{uuid.uuid4().hex[:12].upper()}",
                    'email': investor.get('email'),
                    'account_number': investor.get('account_number'),
                    'portfolio_type': investor.get('portfolio_type'),
                    'investment_type': investor.get('investment_type'),
                    'withdraw_status': 'completed',
                    'created_at': datetime.now().isoformat()
                }
                
                transaction_response = self.supabase.table('transactions').insert(transaction_data).execute()
                transaction_data_result = getattr(transaction_response, 'data', [])
                
                return {
                    'success': True,
                    'interest_deposited': interest_amount,
                    'new_balance': update_result['new_balance'],
                    'transaction_recorded': bool(transaction_data_result)
                }
            
            return {'success': False, 'error': 'Investor not found for update'}
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error processing auto-withdrawal: {str(e)}'
            }

    def get_spending_account_balance(self, investor_id: str) -> Dict[str, Any]:
        """Get current spending account balance for an investor."""
        try:
            account_result = self.get_investor_spending_account(investor_id)
            if not account_result['success']:
                return account_result
            
            account = account_result['account']
            balance = float(account.get('balance', 0))
            
            return {
                'success': True,
                'balance': balance
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error getting spending account balance: {str(e)}'
            }

    def process_user_withdrawal(self, investor_id: str, withdrawal_amount: float) -> Dict[str, Any]:
        """Process user withdrawal request from spending account."""
        try:
            # Check spending account balance
            balance_result = self.get_spending_account_balance(investor_id)
            if not balance_result['success']:
                return balance_result
            
            current_balance = balance_result['balance']
            
            if withdrawal_amount > current_balance:
                return {
                    'success': False,
                    'error': 'Insufficient balance in spending account'
                }
            
            # Deduct amount from spending account
            account_result = self.get_investor_spending_account(investor_id)
            if not account_result['success']:
                return account_result
            
            account = account_result['account']
            new_balance = current_balance - withdrawal_amount
            current_total_withdrawn = float(account.get('total_withdrawn', 0))
            new_total_withdrawn = current_total_withdrawn + withdrawal_amount
            
            # Update spending account
            update_data = {
                'balance': new_balance,
                'total_withdrawn': new_total_withdrawn,
                'updated_at': datetime.now().isoformat()
            }
            
            update_response = self.supabase.table('spending_accounts').update(update_data).eq('id', account['id']).execute()
            update_data_result = getattr(update_response, 'data', [])
            
            if not update_data_result:
                return {
                    'success': False,
                    'error': 'Failed to update spending account'
                }
            
            return {
                'success': True,
                'withdrawn_amount': withdrawal_amount,
                'new_balance': new_balance
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Error processing user withdrawal: {str(e)}'
            }

    def ensure_due_dates_up_to_date(self, investor_id: str) -> Dict[str, Any]:
        """
        Ensure investor due dates are consistent with current time.
        Initializes dates if missing.
        Catches up missed dates (skipping payments for missed weeks) to the current cycle.
        Returns the updated investor data.
        """
        try:
            # Get investor data
            investor_response = self.supabase.table('investors')\
                .select('last_due_date, next_due_date, investment_start_date, created_at, current_week, investment_expiry_date, portfolio_type, investment_type')\
                .eq('id', investor_id)\
                .execute()
            
            investor_data = getattr(investor_response, 'data', [])
            if not investor_data:
                return {'success': False, 'error': 'Investor not found'}
                
            investor = investor_data[0]
            
            last_due_date = investor.get('last_due_date')
            next_due_date = investor.get('next_due_date')
            investment_start_date = investor.get('investment_start_date') or investor.get('created_at')
            current_week = int(investor.get('current_week', 0))
            investment_expiry_date = investor.get('investment_expiry_date')
            investment_type = investor.get('investment_type')
            portfolio_type = investor.get('portfolio_type')
            
            # If no investment type, we can't calculate dates
            if not investment_type:
                return {'success': True, 'data': investor}

            # Parse start date
            if isinstance(investment_start_date, str):
                start_date = datetime.fromisoformat(investment_start_date.replace('Z', '+00:00'))
            elif isinstance(investment_start_date, datetime):
                start_date = investment_start_date
            else:
                # Fallback if no start date
                return {'success': True, 'data': investor}

            now = datetime.now(start_date.tzinfo)
            dates_updated = False

            # 1. Initialize if missing
            if not last_due_date and not next_due_date:
                # Week 0 case: last_due_date is the start date
                last_due_date_obj = start_date
                next_due_date_obj = start_date + timedelta(days=7)
                current_week = 0
                dates_updated = True
            else:
                # Parse existing dates
                if isinstance(last_due_date, str):
                    last_due_date_obj = datetime.fromisoformat(last_due_date.replace('Z', '+00:00'))
                else:
                    last_due_date_obj = last_due_date
                    
                if next_due_date:
                    if isinstance(next_due_date, str):
                        next_due_date_obj = datetime.fromisoformat(next_due_date.replace('Z', '+00:00'))
                    else:
                        next_due_date_obj = next_due_date
                else:
                    # If next_due_date is None, it might be completed or just missing
                    # If completed, we shouldn't be here usually, but let's check expiry
                    # Removing check for 'investment_status' as it doesn't exist
                    pass
                    next_due_date_obj = last_due_date_obj + timedelta(days=7)

            # 2. Catch up if next due date is in the past (SKIP missed payments logic)
            # If next_due_date is strictly in the past (yesterday or before), we skip it.
            # If it is TODAY, we keep it as is so it can be processed.
            
            # We need to be careful: if we run this at 23:59 on due date, it's still today.
            # So "in the past" means < today's date (ignoring time if possible, or just < now)
            # The logic in due_dates.py was: while next_due_date_obj < now: skip
            # This implies if it's 1 second past due, we skip.
            # However, usually we want to pay if it's "Due Today".
            # If the cron ran at 00:01 and paid, next_due is next week.
            # If user logs in at 12:00, next_due is next week.
            # If user logs in at 12:00 and cron FAILED or didn't run, next_due is TODAY.
            # We should NOT skip if it is TODAY.
            
            today_date = now.date()
            
            while next_due_date_obj.date() < today_date and current_week < 52:
                # It was due in the past. Skip it.
                current_week += 1
                last_due_date_obj = next_due_date_obj
                next_due_date_obj = last_due_date_obj + timedelta(days=7)
                dates_updated = True

            # 3. Check expiry using PortfolioService
            # We already have portfolio_type, investment_type, and start_date (parsed as start_date)
            if portfolio_type and investment_type:
                from .portfolio_service import PortfolioService
                portfolio_service = PortfolioService()
                expiry_date_obj = portfolio_service.get_investment_expiry_date(portfolio_type, investment_type, start_date)
                
                if expiry_date_obj:
                    # Ensure both are timezone-aware or both naive for comparison
                    # If one is aware and other is naive, make naive one aware (assume UTC if Z was stripped or missing)
                    if next_due_date_obj.tzinfo is not None and expiry_date_obj.tzinfo is None:
                        expiry_date_obj = expiry_date_obj.replace(tzinfo=next_due_date_obj.tzinfo)
                    elif next_due_date_obj.tzinfo is None and expiry_date_obj.tzinfo is not None:
                        next_due_date_obj = next_due_date_obj.replace(tzinfo=expiry_date_obj.tzinfo)
                        
                    if next_due_date_obj > expiry_date_obj:
                        next_due_date_obj = None
                        dates_updated = True

            # 4. Persist if changed
            if dates_updated:
                update_data = {
                    'last_due_date': last_due_date_obj.isoformat(),
                    'next_due_date': next_due_date_obj.isoformat() if next_due_date_obj else None,
                    'current_week': current_week,
                    'updated_at': datetime.now().isoformat()
                }
                
                self.supabase.table('investors').update(update_data).eq('id', investor_id).execute()
                
                # Update local object to return
                investor['last_due_date'] = update_data['last_due_date']
                investor['next_due_date'] = update_data['next_due_date']
                investor['current_week'] = update_data['current_week']

            return {'success': True, 'data': investor}

        except Exception as e:
            print(f"Error ensuring due dates up to date: {e}")
            return {'success': False, 'error': str(e)}

    def process_investor_due_date_check(self, investor_id: str) -> Dict[str, Any]:
        """
        Check if today is the due date for the investor and process payment if so.
        First ensures dates are up to date.
        """
        try:
            # 1. Ensure dates are sane
            ensure_result = self.ensure_due_dates_up_to_date(investor_id)
            if not ensure_result['success']:
                return ensure_result
            
            investor = ensure_result['data']
            next_due_date = investor.get('next_due_date')
            
            if not next_due_date:
                return {'success': True, 'message': 'No upcoming due date'}

            # 2. Check if due today
            if isinstance(next_due_date, str):
                due_date = datetime.fromisoformat(next_due_date.replace('Z', '+00:00')).date()
            else:
                due_date = next_due_date.date() if isinstance(next_due_date, datetime) else next_due_date
            
            today = date.today()
            
            if due_date == today:
                # Process payment
                result = self.process_auto_withdrawal(investor_id)
                if result['success']:
                    # Update to next week
                    self._update_next_due_date(investor_id)
                    return {'success': True, 'message': 'Interest paid', 'paid': True}
                else:
                    return {'success': False, 'error': result.get('error')}
            
            return {'success': True, 'message': 'Not due today', 'paid': False}

        except Exception as e:
            return {'success': False, 'error': f"Error in due date check: {str(e)}"}

    def check_and_process_all_due_dates(self) -> Dict[str, Any]:
        """
        Iterate over all active investors and process their due dates.
        This is the main entry point for the cron job.
        """
        try:
            # Get all active investors (not completed)
            # We can filter by status if needed, but checking all is safer to catch up
            # Removing filter on 'investment_status' as it doesn't exist.
            # We can filter by 'status' != 'completed' if 'status' is the column.
            # But let's just fetch all for now to be safe and avoid column errors.
            response = self.supabase.table('investors').select('id').execute()
            investors = getattr(response, 'data', [])
            
            processed_count = 0
            errors = []
            
            for investor in investors:
                try:
                    result = self.process_investor_due_date_check(investor['id'])
                    if result['success']:
                        if result.get('paid'):
                            processed_count += 1
                    else:
                        errors.append(f"Investor {investor['id']}: {result.get('error')}")
                except Exception as e:
                    errors.append(f"Investor {investor['id']}: {str(e)}")
            
            return {
                'success': True,
                'processed_count': processed_count,
                'errors': errors
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Error in batch processing: {str(e)}"
            }
            return {
                'success': False,
                'error': f"Error in batch processing: {str(e)}"
            }

    def admin_catch_up_missed_payments(self, investor_id: str) -> Dict[str, Any]:
        """
        Manually process all missed payments for an investor.
        This loops and pays until payment_counter catches up to weeks_elapsed.
        """
        try:
            # 1. Calculate missed
            missed_result = self.calculate_missed_payments(investor_id)
            if not missed_result['success']:
                return missed_result
            
            missed_count = missed_result['missed_payments']
            
            if missed_count <= 0:
                return {'success': True, 'message': 'No missed payments to catch up', 'processed_count': 0}
            
            processed_count = 0
            errors = []
            
            # 2. Loop and pay
            # We process one by one to ensure transaction logging and safety
            for _ in range(missed_count):
                # We call process_auto_withdrawal which now checks the counter
                # It will pay one installment and increment counter
                result = self.process_auto_withdrawal(investor_id)
                
                if result['success'] and result.get('transaction_recorded'):
                    processed_count += 1
                elif result['success'] and not result.get('paid'):
                    # This happens if process_auto_withdrawal decides it shouldn't pay (limit reached?)
                    # Should update missed logic if this happens
                    break 
                else:
                    errors.append(result.get('error', 'Unknown error'))
                    break # Stop on error
            
            # 3. Update due dates to reflect current reality
            self.ensure_due_dates_up_to_date(investor_id)
            
            return {
                'success': True,
                'message': f"Processed {processed_count} missed payments",
                'processed_count': processed_count,
                'errors': errors
            }
            
        except Exception as e:
            return {'success': False, 'error': f"Error in administrative catch-up: {str(e)}"}
