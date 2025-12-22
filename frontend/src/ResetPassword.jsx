import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const ResetPassword = () => {
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [focusedField, setFocusedField] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Real-time password validation
    if (name === 'newPassword') {
      validatePassword(value);
    }
  };

  // Password validation function
  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) {
      errors.push('At least 8 characters');
    }

    // Check for special characters
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    if (!specialCharRegex.test(password)) {
      errors.push('Must contain special characters');
    }

    setPasswordErrors(errors);
    setPasswordValid(errors.length === 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation checks
    if (!passwordValid) {
      setError('Please ensure your password meets the requirements.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email,
          new_password: form.newPassword,
          confirm_password: form.confirmPassword
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Password reset successfully! You can now log in with your new password.');
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.detail || 'Password reset failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
          Reset Password
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
          Create a new password for your account
        </motion.p>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          style={{ marginBottom: '24px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {/* New Password Field */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <motion.input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                onFocus={() => setFocusedField('newPassword')}
                onBlur={() => setFocusedField(null)}
                required
                style={{
                  width: '100%',
                  padding: '14px 50px 14px 16px',
                  borderRadius: '12px',
                  border: focusedField === 'newPassword' ? '2px solid #84cc16' : '2px solid #e5e7eb',
                  fontSize: '16px',
                  fontFamily: '"Lexend Deca", sans-serif',
                  backgroundColor: 'white',
                  color: '#1a1a1a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: focusedField === 'newPassword'
                    ? '0 0 0 3px rgba(132, 204, 22, 0.1)'
                    : '0 1px 2px rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box'
                }}
                animate={{
                  scale: focusedField === 'newPassword' ? 1.02 : 1
                }}
                transition={{ duration: 0.2 }}
              />
              <button
                type="button"
                onClick={toggleNewPasswordVisibility}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#6b7280',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#374151'}
                onMouseLeave={(e) => e.target.style.color = '#6b7280'}
              >
                {showNewPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Requirements */}
            {focusedField === 'newPassword' && (
              <div style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Password requirements:
                </div>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{
                    fontSize: '12px',
                    color: passwordErrors.includes('At least 8 characters') ? '#dc2626' : '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '4px'
                  }}>
                    {passwordErrors.includes('At least 8 characters') ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    At least 8 characters
                  </li>
                  <li style={{
                    fontSize: '12px',
                    color: passwordErrors.includes('Must contain special characters') ? '#dc2626' : '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {passwordErrors.includes('Must contain special characters') ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    Must contain special characters
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <motion.input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                required
                style={{
                  width: '100%',
                  padding: '14px 50px 14px 16px',
                  borderRadius: '12px',
                  border: focusedField === 'confirmPassword' ? '2px solid #84cc16' : '2px solid #e5e7eb',
                  fontSize: '16px',
                  fontFamily: '"Lexend Deca", sans-serif',
                  backgroundColor: 'white',
                  color: '#1a1a1a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: focusedField === 'confirmPassword'
                    ? '0 0 0 3px rgba(132, 204, 22, 0.1)'
                    : '0 1px 2px rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box'
                }}
                animate={{
                  scale: focusedField === 'confirmPassword' ? 1.02 : 1
                }}
                transition={{ duration: 0.2 }}
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#6b7280',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#374151'}
                onMouseLeave={(e) => e.target.style.color = '#6b7280'}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #84cc16, #65a30d)',
              color: '#1a1a1a',
              fontSize: '16px',
              fontWeight: '600',
              padding: '16px',
              borderRadius: '50px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily: '"Lexend Deca", sans-serif',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 25px rgba(132, 204, 22, 0.3)',
              opacity: isSubmitting ? 0.7 : 1
            }}
            whileHover={{
              scale: isSubmitting ? 1 : 1.02,
              boxShadow: isSubmitting ? '0 8px 25px rgba(132, 204, 22, 0.3)' : '0 12px 35px rgba(132, 204, 22, 0.4)'
            }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
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
          transition={{ delay: 0.5, duration: 0.5 }}
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

export default ResetPassword;