import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const VerifyCode = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(600); // 10 minutes
  const [resendAvailable, setResendAvailable] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendAvailable(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to next input if value entered
    if (value !== '' && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);

    if (pasteData.length === 6) {
      const newCode = pasteData.split('');
      setCode(newCode);

      // Focus last input
      if (inputRefs.current[5]) {
        inputRefs.current[5].focus();
      }
    }
  };

  const handleResendCode = async () => {
    setError('');
    setMessage('');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        // Reset countdown
        setCountdown(600);
        setResendAvailable(false);
        // Clear code inputs
        setCode(['', '', '', '', '', '']);
        // Focus first input
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      } else {
        setError(data.detail || 'Failed to resend code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    // Check if all digits are entered
    if (code.some(digit => digit === '')) {
      setError('Please enter all 6 digits');
      return;
    }

    const codeString = code.join('');
    setError('');
    setMessage('');
    setIsVerifying(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email,
          code: codeString,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Code verified successfully');
        // Navigate to reset password page
        setTimeout(() => {
          navigate('/reset-password', { state: { email: email } });
        }, 1500);
      } else {
        setError(data.detail || 'Invalid verification code');
        // Clear inputs and focus first
        setCode(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleTryAnotherWay = () => {
    navigate('/security-question', { state: { email: email } });
  };

  const containerStyle = {
    minHeight: '100vh',
    background: isMobile
      ? 'white'
      : 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 30%, #059669 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobile ? '0' : '20px',
    fontFamily: '"Lexend Deca", -apple-system, BlinkMacSystemFont, sans-serif'
  };

  const cardStyle = {
    background: isMobile ? 'white' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: isMobile ? 'none' : 'blur(20px)',
    borderRadius: isMobile ? '0' : '24px',
    padding: '32px',
    width: '100%',
    maxWidth: isMobile ? 'none' : '400px',
    height: isMobile ? '100vh' : 'auto',
    boxShadow: isMobile ? 'none' : '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: isMobile ? 'flex-start' : 'center',
    paddingTop: isMobile ? '80px' : '32px'
  };

  return (
    <div style={containerStyle}>
      {/* Background decorative elements - only on tablet+ */}
      {!isMobile && (
        <>
          <motion.div
            style={{
              position: 'absolute',
              top: '15%',
              right: '-5%',
              width: '200px',
              height: '200px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '50%',
              filter: 'blur(40px)'
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.1, 0.3]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <motion.div
            style={{
              position: 'absolute',
              bottom: '20%',
              left: '-10%',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '50%',
              filter: 'blur(30px)'
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.05, 0.2]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </>
      )}

      <motion.div
        style={cardStyle}
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        {/* Title */}
        <motion.h1
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '8px',
            fontFamily: '"Lexend Deca", sans-serif'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Verify Code
        </motion.h1>

        {/* Description */}
        <motion.p
          style={{
            fontSize: '14px',
            color: '#666666',
            marginBottom: '24px',
            fontWeight: '400'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Enter the 6-digit code sent to {email}
        </motion.p>

        {/* Code Input */}
        <motion.div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              style={{
                width: '40px',
                height: '50px',
                textAlign: 'center',
                fontSize: '20px',
                fontWeight: '600',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                backgroundColor: 'white',
                color: '#1a1a1a',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              onFocus={(e) => {
                e.target.select();
                e.target.style.borderColor = '#84cc16';
                e.target.style.boxShadow = '0 0 0 3px rgba(132, 204, 22, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              }}
            />
          ))}
        </motion.div>

        {/* Timer */}
        <motion.div
          style={{
            textAlign: 'center',
            marginBottom: '16px',
            fontSize: '14px',
            color: countdown < 120 ? '#dc2626' : '#666666'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {countdown > 0
            ? `Code expires in ${formatTime(countdown)}`
            : 'Code has expired'}
        </motion.div>

        {/* Verify Button */}
        <motion.button
          onClick={handleVerifyCode}
          disabled={isVerifying || code.some(digit => digit === '')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #84cc16, #65a30d)',
            color: '#1a1a1a',
            fontSize: '16px',
            fontWeight: '600',
            padding: '16px',
            borderRadius: '50px',
            border: 'none',
            cursor: (isVerifying || code.some(digit => digit === '')) ? 'not-allowed' : 'pointer',
            fontFamily: '"Lexend Deca", sans-serif',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 25px rgba(132, 204, 22, 0.3)',
            opacity: (isVerifying || code.some(digit => digit === '')) ? 0.7 : 1,
            marginBottom: '16px'
          }}
          whileHover={{
            scale: (isVerifying || code.some(digit => digit === '')) ? 1 : 1.02,
            boxShadow: (isVerifying || code.some(digit => digit === '')) ? '0 8px 25px rgba(132, 204, 22, 0.3)' : '0 12px 35px rgba(132, 204, 22, 0.4)'
          }}
          whileTap={{ scale: (isVerifying || code.some(digit => digit === '')) ? 1 : 0.98 }}
        >
          <span style={{ position: 'relative', zIndex: 1 }}>
            {isVerifying ? 'Verifying...' : 'Verify Code'}
          </span>
        </motion.button>

        {/* Resend Button */}
        <motion.button
          onClick={handleResendCode}
          disabled={!resendAvailable}
          style={{
            width: '100%',
            background: 'white',
            color: resendAvailable ? '#374151' : '#9ca3af',
            fontSize: '16px',
            fontWeight: '500',
            padding: '14px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            cursor: resendAvailable ? 'pointer' : 'not-allowed',
            fontFamily: '"Lexend Deca", sans-serif',
            marginBottom: '16px'
          }}
          whileHover={resendAvailable ? {
            scale: 1.01,
            borderColor: '#d1d5db',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          } : {}}
          whileTap={resendAvailable ? { scale: 0.99 } : {}}
        >
          Resend Code
        </motion.button>

        {/* Message */}
        {message && (
          <motion.div
            style={{
              backgroundColor: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#166534',
              fontSize: '14px',
              textAlign: 'center'
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {message}
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '14px',
              textAlign: 'center'
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </motion.div>
        )}

        {/* Alternative Options */}
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <motion.span
            style={{
              fontSize: '14px',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: '500',
              textDecoration: 'underline'
            }}
            whileHover={{ color: '#1d4ed8' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTryAnotherWay}
          >
            Try another way
          </motion.span>

          <motion.span
            style={{
              fontSize: '14px',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: '500',
              textDecoration: 'underline'
            }}
            whileHover={{ color: '#1d4ed8' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBackToLogin}
          >
            Back to Login
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default VerifyCode;