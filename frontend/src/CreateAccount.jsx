import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, User } from 'lucide-react';

const Signup = () => {
  const [form, setForm] = useState({
    firstName: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    securityQuestion: '',
    securityAnswer: '',
    referralCode: '',
    profilePic: null
  });
  const [focusedField, setFocusedField] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [profilePreview, setProfilePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [referralCodeValid, setReferralCodeValid] = useState(null);
  const [referralCodeChecking, setReferralCodeChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const securityQuestions = [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What is your favorite color?",
    "What city were you born in?",
    "What is your favorite food?"
  ];

  const navigate = useNavigate();

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
    if (name === 'password') {
      validatePassword(value);
    }

    // Check email availability when email changes
    if (name === 'email') {
      setEmailAvailable(null); // Reset availability check
    }

    // Check referral code validity when referral code changes
    if (name === 'referralCode') {
      setReferralCodeValid(null); // Reset validity check
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

  // Check email availability
  const checkEmailAvailability = async (email) => {
    if (!email || !email.includes('@')) return;

    setEmailChecking(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setEmailAvailable(data.available);
    } catch (error) {
      console.error('Email check failed:', error);
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };

  // Check referral code validity
  const checkReferralCodeValidity = async (code) => {
    if (!code || code.trim().length === 0) {
      setReferralCodeValid(null);
      return;
    }

    setReferralCodeChecking(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/referral/validate?referral_code=${encodeURIComponent(code.trim().toUpperCase())}`);
      const data = await response.json();
      setReferralCodeValid(data.success);
    } catch (error) {
      console.error('Referral code check failed:', error);
      setReferralCodeValid(null);
    } finally {
      setReferralCodeChecking(false);
    }
  };

  const handleFileUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      setForm({ ...form, profilePic: file });
      const reader = new FileReader();
      reader.onload = (e) => setProfilePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation checks
    if (!passwordValid) {
      alert('Please ensure your password meets the requirements.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (emailAvailable === false) {
      alert('Please use a different email address.');
      return;
    }

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('firstName', form.firstName);
    formData.append('surname', form.surname);
    formData.append('email', form.email);
    formData.append('password', form.password);
    formData.append('phoneNumber', form.phoneNumber);
    formData.append('address', form.address);
    formData.append('dateOfBirth', form.dateOfBirth);
    formData.append('securityQuestion', form.securityQuestion);
    formData.append('securityAnswer', form.securityAnswer);

    // Include referral code if provided and valid
    if (form.referralCode && form.referralCode.trim() && referralCodeValid === true) {
      formData.append('referralCode', form.referralCode.trim().toUpperCase());
    }

    if (profilePreview) {
      formData.append('profilePic', profilePreview);
    }

    setIsSubmitting(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success message and redirect to login page
        alert('Account created successfully! Please log in with your email and password.');
        // Navigate to login page
        navigate('/login');
      } else {
        alert(data.detail || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      alert('Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google signup
  const handleGoogleSignup = () => {
    // Prevent duplicate clicks
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);

    // Redirect to Google OAuth endpoint
    // Small timeout so the disabled state can render before navigation
    setTimeout(() => {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      window.location.href = `${API_BASE_URL}/auth/google/login`;
    }, 50);
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
    maxWidth: isMobile ? 'none' : '500px',
    height: isMobile ? '100vh' : 'auto',
    boxShadow: isMobile ? 'none' : '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: isMobile ? 'flex-start' : 'center',
    paddingTop: isMobile ? '60px' : '32px',
    overflowY: 'auto'
  };

  const inputStyle = (fieldName) => ({
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: focusedField === fieldName ? '2px solid #84cc16' : '2px solid #e5e7eb',
    fontSize: '16px',
    fontFamily: '"Lexend Deca", sans-serif',
    backgroundColor: 'white',
    color: 'gray',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: focusedField === fieldName
      ? '0 0 0 3px rgba(132, 204, 22, 0.1)'
      : '0 1px 2px rgba(0, 0, 0, 0.05)',
    boxSizing: 'border-box'
  });

  const selectStyle = (fieldName) => ({
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: focusedField === fieldName ? '2px solid #84cc16' : '2px solid #e5e7eb',
    fontSize: '16px',
    fontFamily: '"Lexend Deca", sans-serif',
    backgroundColor: '#eceeecff',
    color: 'gray',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: focusedField === fieldName
      ? '0 0 0 3px rgba(132, 204, 22, 0.1)'
      : '0 1px 2px rgba(0, 0, 0, 0.05)',
    boxSizing: 'border-box',
    cursor: 'pointer'
  });

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px'
  };

  const fieldContainerStyle = {
    marginBottom: '16px'
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
          Create Account
        </motion.h1>

        {/* Terms text */}
        <motion.p
          style={{
            fontSize: '12px',
            color: '#666666',
            marginBottom: '24px',
            fontWeight: '400'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Join us to start your investment journey
        </motion.p>

        {/* Profile Picture Upload */}
        <motion.div
          style={fieldContainerStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <label style={labelStyle}>Profile Picture</label>
          <motion.div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: dragOver ? '3px dashed #84cc16' : '2px dashed #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: dragOver ? 'rgba(132, 204, 22, 0.05)' : '#f9fafb',
              margin: '0 auto 16px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {profilePreview ? (
              <img
                src={profilePreview}
                alt="Profile preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%'
                }}
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: '#9ca3af'
              }}>
                <Camera size={24} />
                <span style={{ fontSize: '10px', textAlign: 'center' }}>
                  Upload Photo
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
          </motion.div>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          style={{ marginBottom: '24px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {/* Name Row */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First Name</label>
              <motion.input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField(null)}
                required
                style={inputStyle('firstName')}
                animate={{
                  scale: focusedField === 'firstName' ? 1.02 : 1
                }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Surname</label>
              <motion.input
                type="text"
                name="surname"
                value={form.surname}
                onChange={handleChange}
                onFocus={() => setFocusedField('surname')}
                onBlur={() => setFocusedField(null)}
                required
                style={inputStyle('surname')}
                animate={{
                  scale: focusedField === 'surname' ? 1.02 : 1
                }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>

          {/* Email Field */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Email</label>
            <motion.input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              onFocus={() => setFocusedField('email')}
              onBlur={(e) => {
                setFocusedField(null);
                checkEmailAvailability(e.target.value);
              }}
              required
              style={{
                ...inputStyle('email'),
                border: emailAvailable === false ? '2px solid #ef4444' :
                  emailAvailable === true ? '2px solid #10b981' :
                    inputStyle('email').border
              }}
              animate={{
                scale: focusedField === 'email' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            />
            {emailChecking && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Checking availability...
              </div>
            )}
            {emailAvailable !== null && !emailChecking && (
              <div style={{
                fontSize: '12px',
                color: emailAvailable ? '#10b981' : '#ef4444',
                marginTop: '4px'
              }}>
                {emailAvailable ? '✓ Email available' : '✗ Email already exists'}
              </div>
            )}
          </div>

          {/* Referral Code Field */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Referral Code <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>(Optional)</span></label>
            <motion.input
              type="text"
              name="referralCode"
              value={form.referralCode}
              onChange={handleChange}
              onFocus={() => setFocusedField('referralCode')}
              onBlur={(e) => {
                setFocusedField(null);
                checkReferralCodeValidity(e.target.value);
              }}
              placeholder="Enter referral code to earn bonus points"
              style={{
                ...inputStyle('referralCode'),
                border: referralCodeValid === false ? '2px solid #ef4444' :
                  referralCodeValid === true ? '2px solid #10b981' :
                    inputStyle('referralCode').border,
                textTransform: 'uppercase'
              }}
              animate={{
                scale: focusedField === 'referralCode' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            />
            {referralCodeChecking && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Validating referral code...
              </div>
            )}
            {referralCodeValid !== null && !referralCodeChecking && (
              <div style={{
                fontSize: '12px',
                color: referralCodeValid ? '#10b981' : '#ef4444',
                marginTop: '4px'
              }}>
                {referralCodeValid ? '✓ Valid referral code - You\'ll earn bonus points!' : '✗ Invalid referral code'}
              </div>
            )}
            {form.referralCode && !referralCodeChecking && referralCodeValid === null && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Enter a referral code to validate it
              </div>
            )}
          </div>

          {/* Password Field */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Password</label>
            <motion.input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              required
              style={inputStyle('password')}
              animate={{
                scale: focusedField === 'password' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            />
            {form.password && (
              <div style={{
                fontSize: '12px',
                marginTop: '4px',
                color: passwordValid ? '#10b981' : '#ef4444'
              }}>
                {passwordValid ? '✓ Password meets requirements' : passwordErrors.join(', ')}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Confirm Password</label>
            <motion.input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              required
              style={{
                ...inputStyle('confirmPassword'),
                border: form.confirmPassword && form.password !== form.confirmPassword ? '2px solid #ef4444' : inputStyle('confirmPassword').border
              }}
              animate={{
                scale: focusedField === 'confirmPassword' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                ✗ Passwords do not match
              </div>
            )}
            {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword && (
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                ✓ Passwords match
              </div>
            )}
          </div>

          {/* Phone Number Field */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Phone Number</label>
            <motion.input
              type="tel"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              onFocus={() => setFocusedField('phoneNumber')}
              onBlur={() => setFocusedField(null)}
              required
              style={inputStyle('phoneNumber')}
              animate={{
                scale: focusedField === 'phoneNumber' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            />
          </div>

          {/* Address Field */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Address</label>
            <motion.textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              onFocus={() => setFocusedField('address')}
              onBlur={() => setFocusedField(null)}
              required
              rows="3"
              style={{
                ...inputStyle('address'),
                resize: 'vertical',
                minHeight: '80px'
              }}
              animate={{
                scale: focusedField === 'address' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            />
          </div>

          {/* Date of Birth */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date of Birth</label>
              <motion.input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                onFocus={() => setFocusedField('dateOfBirth')}
                onBlur={() => setFocusedField(null)}
                required
                style={inputStyle('dateOfBirth')}
                animate={{
                  scale: focusedField === 'dateOfBirth' ? 1.02 : 1
                }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>

          {/* Security Question Field */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Security Question</label>
            <motion.select
              name="securityQuestion"
              value={form.securityQuestion}
              onChange={handleChange}
              onFocus={() => setFocusedField('securityQuestion')}
              onBlur={() => setFocusedField(null)}
              required
              style={selectStyle('securityQuestion')}
              animate={{
                scale: focusedField === 'securityQuestion' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            >
              <option value="">Select a security question</option>
              {securityQuestions.map((question, index) => (
                <option key={index} value={question}>
                  {question}
                </option>
              ))}
            </motion.select>
          </div>

          {/* Security Answer Field */}
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>Security Answer</label>
            <motion.input
              type="text"
              name="securityAnswer"
              value={form.securityAnswer}
              onChange={handleChange}
              onFocus={() => setFocusedField('securityAnswer')}
              onBlur={() => setFocusedField(null)}
              required
              style={inputStyle('securityAnswer')}
              animate={{
                scale: focusedField === 'securityAnswer' ? 1.02 : 1
              }}
              transition={{ duration: 0.2 }}
            />
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
              marginTop: '8px',
              opacity: isSubmitting ? 0.7 : 1
            }}
            onHoverStart={() => !isSubmitting && setHoveredButton('submit')}
            onHoverEnd={() => setHoveredButton(null)}
            whileHover={{
              scale: isSubmitting ? 1 : 1.02,
              boxShadow: isSubmitting ? '0 8px 25px rgba(132, 204, 22, 0.3)' : '0 12px 35px rgba(132, 204, 22, 0.4)'
            }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
              }}
              animate={{
                left: (hoveredButton === 'submit' && !isSubmitting) ? '100%' : '-100%'
              }}
              transition={{ duration: 0.6 }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </span>
          </motion.button>
        </motion.form>

        {/* Divider */}
        <motion.div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '24px 0',
            gap: '12px'
          }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(to right, transparent, #d1d5db, transparent)'
          }} />
          <span style={{
            fontSize: '14px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Or
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(to left, transparent, #d1d5db, transparent)'
          }} />
        </motion.div>

        {/* Google Sign Up Button */}
        <motion.button
          type="button"
          disabled={isGoogleLoading}
          style={{
            width: '100%',
            background: 'white',
            border: '2px solid #e5e7eb',
            color: '#374151',
            fontSize: '16px',
            fontWeight: '500',
            padding: '14px',
            borderRadius: '12px',
            cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
            fontFamily: '"Lexend Deca", sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px',
            transition: 'all 0.2s ease',
            opacity: isGoogleLoading ? 0.7 : 1
          }}
          onHoverStart={() => !isGoogleLoading && setHoveredButton('google')}
          onHoverEnd={() => setHoveredButton(null)}
          whileHover={{
            scale: isGoogleLoading ? 1 : 1.01,
            borderColor: '#d1d5db',
            boxShadow: isGoogleLoading ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
          whileTap={{ scale: isGoogleLoading ? 1 : 0.99 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          onClick={handleGoogleSignup}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isGoogleLoading ? 'Connecting to Google...' : 'Sign up with Google'}
        </motion.button>

        {/* Terms and Login Link */}
        <motion.div
          style={{
            textAlign: 'center'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '12px',
            lineHeight: '1.4'
          }}>
            By creating an account, you agree to our{' '}
            <span style={{
              color: '#2563eb',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}>
              Terms and Conditions
            </span>
          </p>

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
            onClick={() => navigate('/login')}
          >
            Already have an account? Log in
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signup;
