import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const SecurityQuestion = () => {
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState('');

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

  // Fetch the user's security question from the backend
  useEffect(() => {
    const fetchSecurityQuestion = async () => {
      if (!email) return;

      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const response = await fetch(`${API_BASE_URL}/auth/security-question?email=${encodeURIComponent(email)}`);

        if (response.ok) {
          const data = await response.json();
          setSecurityQuestion(data.security_question);
        } else {
          // Fallback to a default question if there's an error
          setSecurityQuestion("What is your mother's maiden name?");
        }
      } catch (err) {
        console.error('Failed to fetch security question:', err);
        // Fallback to a default question if there's a network error
        setSecurityQuestion("What is your mother's maiden name?");
      }
    };

    fetchSecurityQuestion();
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsVerifying(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/security-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email,
          answer: securityAnswer
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Security question verified successfully');
        // Navigate to reset password page
        setTimeout(() => {
          navigate('/reset-password', { state: { email: email } });
        }, 1500);
      } else {
        setError(data.detail || 'Incorrect security answer');
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
          Security Question
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
          Answer your security question to reset your password
        </motion.p>

        {/* Security Question */}
        <motion.div
          style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid #e5e7eb'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div style={{
            fontSize: '16px',
            fontWeight: '500',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            {securityQuestion}
          </div>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          style={{ marginBottom: '24px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {/* Security Answer Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Your Answer
            </label>
            <motion.input
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              onFocus={() => setFocusedField('securityAnswer')}
              onBlur={() => setFocusedField(null)}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: focusedField === 'securityAnswer' ? '2px solid #84cc16' : '2px solid #e5e7eb',
                fontSize: '16px',
                fontFamily: '"Lexend Deca", sans-serif',
                backgroundColor: 'white',
                color: '#1a1a1a',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: focusedField === 'securityAnswer'
                  ? '0 0 0 3px rgba(132, 204, 22, 0.1)'
                  : '0 1px 2px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box'
              }}
              animate={{
                scale: focusedField === 'securityAnswer' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            />
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isVerifying}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #84cc16, #65a30d)',
              color: '#1a1a1a',
              fontSize: '16px',
              fontWeight: '600',
              padding: '16px',
              borderRadius: '50px',
              border: 'none',
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              fontFamily: '"Lexend Deca", sans-serif',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 25px rgba(132, 204, 22, 0.3)',
              opacity: isVerifying ? 0.7 : 1
            }}
            whileHover={{
              scale: isVerifying ? 1 : 1.02,
              boxShadow: isVerifying ? '0 8px 25px rgba(132, 204, 22, 0.3)' : '0 12px 35px rgba(132, 204, 22, 0.4)'
            }}
            whileTap={{ scale: isVerifying ? 1 : 0.98 }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>
              {isVerifying ? 'Verifying...' : 'Verify Answer'}
            </span>
          </motion.button>
        </motion.form>

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

        {/* Back to Login */}
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
            onClick={handleBackToLogin}
          >
            Back to Login
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SecurityQuestion;