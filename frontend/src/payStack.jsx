import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Shield, Lock, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Payment Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const paymentService = {
  async initializePayment(paymentData) {
    const response = await fetch(`${API_BASE_URL}/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (!response.ok) throw new Error('Failed to initialize payment');
    return response.json();
  },

  async verifyPayment(reference) {
    const response = await fetch(`${API_BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference })
    });
    if (!response.ok) throw new Error('Failed to verify payment');
    return response.json();
  }
};

const PaymentForm = ({
  orderData,
  formData,
  updateFormData,
  handlePayment,
  isLoading,
  error
}) => (
  <div className="space-y-6">
    <div className="text-center pb-6 border-b border-gray-200">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-green-600" />
        <span className="text-sm text-green-600 font-medium">Secured by Paystack</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900">Complete your payment</h3>
      <p className="text-gray-600 text-sm mt-1">Your payment information is encrypted and secure</p>
    </div>

    {error && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-900">Payment Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    )}

    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{orderData.merchant}</h3>
          <p className="text-sm text-gray-600">{orderData.portfolioType}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-green-600 text-lg">₦{orderData.amount.toLocaleString()}</p>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="your@email.com"
          required
        />
      </div>
    </div>

    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
      <Lock className="w-4 h-4" />
      <span>Your payment is protected by 256-bit SSL encryption</span>
    </div>

    <div className="space-y-3 pt-4">
      <button
        onClick={handlePayment}
        disabled={!formData.email || isLoading}
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Initializing...
          </>
        ) : (
          `Pay ₦${orderData.amount.toLocaleString()}`
        )}
      </button>
    </div>
  </div>
);

const ProcessingScreen = ({ orderData }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <Loader className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your payment</h2>
    <p className="text-gray-600 mb-6">Please wait while we confirm your transaction</p>

    <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600">Amount:</span>
        <span className="font-medium text-gray-900">₦{orderData.amount.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Portfolio:</span>
        <span className="font-medium text-gray-900">{orderData.portfolioType}</span>
      </div>
    </div>
  </div>
);

const SuccessScreen = ({ orderData, transactionData, onContinue }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <CheckCircle className="w-8 h-8 text-green-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
    <p className="text-gray-600 mb-6">Your payment has been processed successfully</p>

    <div className="bg-gray-50 rounded-xl p-6 max-w-sm mx-auto mb-8">
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Transaction ID:</span>
          <span className="font-mono text-sm">{transactionData?.reference}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Amount Paid:</span>
          <span className="font-semibold text-green-600">₦{orderData.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Portfolio:</span>
          <span className="font-medium">{orderData.portfolioType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className="text-green-600 font-medium">Completed</span>
        </div>
      </div>
    </div>

    <button
      onClick={onContinue}
      className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all"
    >
      Continue to Dashboard
    </button>
  </div>
);

const PaystackCheckout = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactionData, setTransactionData] = useState(null);
  const [formData, setFormData] = useState({
    email: ''
  });

  // Get order data from URL parameters or use defaults
  const urlParams = new URLSearchParams(window.location.search);
  const amount = parseFloat(urlParams.get('amount')) || 45000;
  const portfolioType = urlParams.get('portfolio') || 'Conservative Portfolio';
  const reference = urlParams.get('reference');

  const orderData = {
    merchant: 'Incap Fx',
    amount: amount,
    portfolioType: portfolioType
  };

  useEffect(() => {
    // If we have a reference, it means we're returning from Paystack
    if (reference) {
      handleVerifyPayment(reference);
    }

    // Pre-fill email if provided in URL
    const email = urlParams.get('email');
    if (email) {
      setFormData(prev => ({ ...prev, email }));
    }
  }, [reference]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handlePayment = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Note: In the new flow, payment initialization happens in OpenAccountWizard
      // This form is only used if someone accesses the payment page directly
      const response = await paymentService.initializePayment({
        email: formData.email,
        amount: orderData.amount,
        portfolio_type: orderData.portfolioType
      });

      if (response.status && response.data?.authorization_url) {
        window.location.href = response.data.authorization_url;
      } else {
        setError(response.message || 'Failed to initialize payment');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing your payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async (reference) => {
    setCurrentStep(1);

    try {
      const response = await paymentService.verifyPayment(reference);

      if (response.status) {
        setTransactionData(response.data.transaction || response.data);

        // Check if investor record was created
        if (response.data.investor) {
          // Payment successful and investor record created
          setCurrentStep(2);
        } else if (response.data.status === 'success') {
          // Payment successful but no investor data (might be a direct payment)
          setCurrentStep(2);
        } else {
          // Payment verification failed
          setError(response.message || 'Payment verification failed');
          setCurrentStep(0);
        }
      } else {
        setError(response.message || 'Payment verification failed');
        setCurrentStep(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to verify payment');
      setCurrentStep(0);
    }
  };

  const handleContinue = () => {
    // Redirect to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold">Paystack</h1>
              <p className="text-blue-100 text-sm">Secure Payment Gateway</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {currentStep === 0 && (
            <PaymentForm
              orderData={orderData}
              formData={formData}
              updateFormData={updateFormData}
              handlePayment={handlePayment}
              isLoading={isLoading}
              error={error}
            />
          )}
          {currentStep === 1 && (
            <ProcessingScreen orderData={orderData} />
          )}
          {currentStep === 2 && (
            <SuccessScreen
              orderData={orderData}
              transactionData={transactionData}
              onContinue={handleContinue}
            />
          )}
        </div>

        <div className="border-t border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Secured</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>PCI Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaystackCheckout;
