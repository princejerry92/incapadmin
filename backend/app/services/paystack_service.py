from pypaystack2 import PaystackClient
from typing import Optional, Dict, Any
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)


class PaystackService:
    def __init__(self):
        if not settings.PAYSTACK_SECRET_KEY:
            raise ValueError("PAYSTACK_SECRET_KEY is not set in environment variables. Please check your .env file.")

        # Use the package's main client. Sub-clients are available as attributes
        # e.g. client.transactions, client.customers
        self.client = PaystackClient(secret_key=settings.PAYSTACK_SECRET_KEY)
        self.transfer_recipients = self.client.transfer_recipients
        self.transfers = self.client.transfers
        self.misc = self.client.miscellaneous

    def _normalize_response(self, resp: Any) -> Dict[str, Any]:
        """Normalize pypaystack2 Response objects or dicts into a simple dict.

        Returns a dict with at least 'status', 'message', and 'data' keys.
        """
        try:
            # pypaystack2 returns a pydantic Response model with attributes
            if hasattr(resp, 'status'):
                status = getattr(resp, 'status')
                message = getattr(resp, 'message', None)
                data = getattr(resp, 'data', None)
                # If data is a pydantic model, convert to dict
                if hasattr(data, 'dict'):
                    try:
                        data = data.dict()
                    except Exception:
                        # leave as-is if conversion fails
                        pass
                return {"status": status, "message": message, "data": data}
            # If it's already a dict-like response
            if isinstance(resp, dict):
                return resp
            # Fallback: try to cast to dict
            return dict(resp)
        except Exception:
            return {"status": False, "message": "Unknown response from Paystack client", "data": None}

    def initialize_transaction(
        self,
        email: str,
        amount: int,  # Amount in kobo (NGN * 100)
        metadata: Optional[Dict[str, Any]] = None,
        callback_url: Optional[str] = None,
        reference: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initialize a Paystack transaction

        Args:
            email: Customer email
            amount: Amount in kobo (multiply naira by 100)
            metadata: Additional transaction data
            callback_url: URL to redirect after payment
            reference: Unique transaction reference
        """
        try:
            logger.info("Initializing Paystack transaction for email: %s, amount: %d kobo", email, amount)
            response = self.transactions.initialize(
                email=email,
                amount=amount,
                metadata=metadata,
                callback_url=callback_url,
                reference=reference
            )
            norm = self._normalize_response(response)

            if norm.get('status'):
                data = norm.get('data') or {}
                # data may be a dict or pydantic model converted earlier
                return {
                    "status": True,
                    "message": norm.get('message') or "Transaction initialized successfully",
                    "data": {
                        "authorization_url": data.get('authorization_url') if isinstance(data, dict) else getattr(data, 'authorization_url', None),
                        "access_code": data.get('access_code') if isinstance(data, dict) else getattr(data, 'access_code', None),
                        "reference": data.get('reference') if isinstance(data, dict) else getattr(data, 'reference', None),
                    }
                }
            else:
                logger.error("Paystack initialization failed: %s", norm.get('message'))
                return {"status": False, "message": norm.get('message', 'Failed to initialize transaction')}
        except Exception as e:
            logger.exception("Error initializing transaction: %s", str(e))
            return {
                "status": False,
                "message": f"Error initializing transaction: {str(e)}"
            }

    def verify_transaction(self, reference: str) -> Dict[str, Any]:
        """
        Verify a Paystack transaction

        Args:
            reference: Transaction reference to verify
        """
        try:
            response = self.transactions.verify(reference=reference)
            norm = self._normalize_response(response)

            if norm.get('status'):
                data = norm.get('data') or {}
                # data could be a dict or model
                def _get(d, k):
                    return d.get(k) if isinstance(d, dict) else getattr(d, k, None)

                return {
                    "status": True,
                    "message": norm.get('message') or "Transaction verified successfully",
                    "data": {
                        "reference": _get(data, 'reference'),
                        "amount": _get(data, 'amount'),
                        "status": _get(data, 'status'),
                        "paid_at": _get(data, 'paid_at'),
                        "customer": _get(data, 'customer'),
                        "metadata": _get(data, 'metadata')
                    }
                }
            else:
                return {"status": False, "message": norm.get('message', 'Failed to verify transaction')}
        except Exception as e:
            logger.exception("Error verifying transaction: %s", str(e))
            return {
                "status": False,
                "message": f"Error verifying transaction: {str(e)}"
            }

    def create_customer(self, email: str, first_name: str, last_name: str, phone: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a Paystack customer
        """
        try:
            response = self.customers.create(
                email=email,
                first_name=first_name,
                last_name=last_name,
                phone=phone
            )
            norm = self._normalize_response(response)

            if norm.get('status'):
                return {"status": True, "message": norm.get('message') or "Customer created successfully", "data": norm.get('data')}
            else:
                return {"status": False, "message": norm.get('message', 'Failed to create customer')}
        except Exception as e:
            logger.exception("Error creating customer: %s", str(e))
            return {
                "status": False,
                "message": f"Error creating customer: {str(e)}"
            }

    def list_transactions(self, page: int = 1, per_page: int = 50) -> Dict[str, Any]:
        """
        List all transactions
        """
        try:
            response = self.transactions.list(page=page, perPage=per_page)
            norm = self._normalize_response(response)

            if norm.get('status'):
                return {"status": True, "message": norm.get('message') or "Transactions retrieved successfully", "data": norm.get('data')}
            else:
                return {"status": False, "message": norm.get('message', 'Failed to retrieve transactions')}
        except Exception as e:
            logger.exception("Error retrieving transactions: %s", str(e))
            return {
                "status": False,
                "message": f"Error retrieving transactions: {str(e)}"
            }

    # --- Payout / Transfer Methods ---

    def resolve_bank_code(self, bank_name: str) -> Optional[str]:
        """
        Resolve bank name to bank code.
        Note: This is a best-effort matching.
        """
        try:
            # Fetch list of banks from Paystack
            response = self.misc.list_banks(country="nigeria")
            norm = self._normalize_response(response)
            
            if not norm.get('status'):
                logger.error("Failed to list banks for resolution: %s", norm.get('message'))
                return None
                
            banks = norm.get('data') or []
            if not banks:
                return None
                
            # Normalize bank name for comparison
            target_name = bank_name.lower().strip()
            
            # Try exact match first
            for bank in banks:
                if bank.get('name', '').lower() == target_name:
                    return bank.get('code')
            
            # Try fuzzy match (contains)
            for bank in banks:
                if target_name in bank.get('name', '').lower() or bank.get('name', '').lower() in target_name:
                    return bank.get('code')
                    
            return None
            
        except Exception as e:
            logger.exception("Error resolving bank code: %s", str(e))
            return None

    def create_transfer_recipient(
        self, 
        name: str, 
        account_number: str, 
        bank_code: str, 
        currency: str = "NGN"
    ) -> Dict[str, Any]:
        """
        Create a Transfer Recipient
        """
        try:
            response = self.transfer_recipients.create(
                type="nuban",
                name=name,
                account_number=account_number,
                bank_code=bank_code,
                currency=currency
            )
            norm = self._normalize_response(response)
            
            if norm.get('status'):
                return {"status": True, "message": "Recipient created", "data": norm.get('data')}
            else:
                return {"status": False, "message": norm.get('message', "Failed to create recipient")}
                
        except Exception as e:
            logger.exception("Error creating transfer recipient: %s", str(e))
            return {"status": False, "message": f"Error creating recipient: {str(e)}"}

    def initiate_transfer(
        self, 
        amount: int, 
        recipient_code: str, 
        reason: str = "Withdrawal Payout", 
        reference: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate a Transfer
        amount: in kobo
        """
        try:
            response = self.transfers.initiate(
                amount=amount,
                recipient=recipient_code,
                reason=reason,
                reference=reference
            )
            norm = self._normalize_response(response)
            
            if norm.get('status'):
                return {"status": True, "message": "Transfer initiated", "data": norm.get('data')}
            else:
                return {"status": False, "message": norm.get('message', "Failed to initiate transfer")}
                
        except Exception as e:
            logger.exception("Error initiating transfer: %s", str(e))
            return {"status": False, "message": f"Error initiating transfer: {str(e)}"}

# Instantiate service
paystack_service = PaystackService()
