import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [focusedField, setFocusedField] = useState(null);
    const [hoveredButton, setHoveredButton] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const timeoutRef = useRef(null);

    const navigate = useNavigate();

    const handleSignup = () => {
        navigate('/signup');
    };

    const handleForgotPassword = () => {
        navigate('/forgot-password');
    };

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        // Check for remembered email
        const rememberedEmail = localStorage.getItem('remembered_email');
        if (rememberedEmail) {
            setForm(prev => ({ ...prev, email: rememberedEmail }));
            setRememberMe(true);
        }

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const togglePasswordVisibility = () => {
        setShowPassword(true);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setShowPassword(false);
        }, 3000); // Show for 3 seconds
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    email: form.email,
                    password: form.password,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Handle Remember Me
                if (rememberMe) {
                    localStorage.setItem('remembered_email', form.email);
                } else {
                    localStorage.removeItem('remembered_email');
                }

                // Store session token
                localStorage.setItem('session_token', data.session_token);

                // Store in all_sessions for switch account feature
                const currentSessions = JSON.parse(localStorage.getItem('all_sessions') || '[]');
                // Remove existing session for this user if any (to update token)
                const updatedSessions = currentSessions.filter(s => s.user.email !== data.user.email);
                updatedSessions.push({
                    user: data.user,
                    token: data.session_token,
                    lastLogin: Date.now()
                });
                localStorage.setItem('all_sessions', JSON.stringify(updatedSessions));

                // Check if user has investment account by trying to fetch dashboard data
                try {
                    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                    const dashboardResponse = await fetch(`${API_BASE_URL}/dashboard/data`, {
                        headers: {
                            'Authorization': `Bearer ${data.session_token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (dashboardResponse.ok) {
                        // User has investment account, go to get started page
                        navigate('/get-started');
                    } else {
                        // User doesn't have investment account, go to get started page
                        navigate('/get-started');
                    }
                } catch (error) {
                    console.error('Error checking investment account:', error);
                    // On error, go to get started page
                    navigate('/get-started');
                }
            } else {
                setError(data.detail || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Google login
    const handleGoogleLogin = () => {
        // Prevent duplicate clicks
        if (isGoogleLoading) return;

        setIsGoogleLoading(true);

        // Redirect to Google OAuth endpoint
        // Using a short timeout to ensure the disabled state renders before navigation
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
                    Log in
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
                    By Logging in You agree to the terms of use
                </motion.p>

                {/* Form */}
                <motion.form
                    onSubmit={handleSubmit}
                    style={{ marginBottom: '24px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    {/* Email Field */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '6px'
                        }}>
                            Email
                        </label>
                        <motion.input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                            required
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: focusedField === 'email' ? '2px solid #84cc16' : '2px solid #e5e7eb',
                                fontSize: '16px',
                                fontFamily: '"Lexend Deca", sans-serif',
                                backgroundColor: 'white',
                                color: '#1a1a1a',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                boxShadow: focusedField === 'email'
                                    ? '0 0 0 3px rgba(132, 204, 22, 0.1)'
                                    : '0 1px 2px rgba(0, 0, 0, 0.05)',
                                boxSizing: 'border-box'
                            }}
                            animate={{
                                scale: focusedField === 'email' ? 1.02 : 1
                            }}
                            transition={{ duration: 0.2 }}
                        />
                    </div>

                    {/* Password Field */}
                    <div style={{ marginBottom: '16px', position: 'relative' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '6px'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <motion.input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '14px 50px 14px 16px',
                                    borderRadius: '12px',
                                    border: focusedField === 'password' ? '2px solid #84cc16' : '2px solid #e5e7eb',
                                    fontSize: '16px',
                                    fontFamily: '"Lexend Deca", sans-serif',
                                    backgroundColor: 'white',
                                    color: '#1a1a1a',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                    boxShadow: focusedField === 'password'
                                        ? '0 0 0 3px rgba(132, 204, 22, 0.1)'
                                        : '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    boxSizing: 'border-box'
                                }}
                                animate={{
                                    scale: focusedField === 'password' ? 1.02 : 1
                                }}
                                transition={{ duration: 0.2 }}
                            />
                            <button
                                type="button"
                                onClick={togglePasswordVisibility}
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
                                {showPassword ? (
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

                    {/* Remember Me Checkbox */}
                    <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: '#374151',
                            userSelect: 'none'
                        }}>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{
                                    marginRight: '8px',
                                    width: '16px',
                                    height: '16px',
                                    cursor: 'pointer',
                                    accentColor: '#84cc16'
                                }}
                            />
                            Remember me
                        </label>
                    </div>

                    {/* Login Button */}
                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #84cc16, #65a30d)',
                            color: '#1a1a1a',
                            fontSize: '16px',
                            fontWeight: '600',
                            padding: '16px',
                            borderRadius: '50px',
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontFamily: '"Lexend Deca", sans-serif',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 8px 25px rgba(132, 204, 22, 0.3)',
                            opacity: isLoading ? 0.7 : 1
                        }}
                        onHoverStart={() => !isLoading && setHoveredButton('login')}
                        onHoverEnd={() => setHoveredButton(null)}
                        whileHover={{
                            scale: isLoading ? 1 : 1.02,
                            boxShadow: isLoading ? '0 8px 25px rgba(132, 204, 22, 0.3)' : '0 12px 35px rgba(132, 204, 22, 0.4)'
                        }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
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
                                left: (hoveredButton === 'login' && !isLoading) ? '100%' : '-100%'
                            }}
                            transition={{ duration: 0.6 }}
                        />
                        <span style={{ position: 'relative', zIndex: 1 }}>
                            {isLoading ? 'Logging in...' : 'Log in'}
                        </span>
                    </motion.button>
                </motion.form>

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
                    transition={{ delay: 0.6, duration: 0.5 }}
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

                {/* Google Sign In Button */}
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
                    transition={{ delay: 0.7, duration: 0.5 }}
                    onClick={handleGoogleLogin}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google'}
                </motion.button>

                {/* Terms and Conditions */}
                <motion.p
                    style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        textAlign: 'center',
                        marginBottom: '20px',
                        lineHeight: '1.4'
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                >
                    For more information see our{' '}
                    <span style={{
                        color: '#2563eb',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}>
                        Terms and Conditions
                    </span>
                </motion.p>

                {/* Additional Links */}
                <motion.div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        alignItems: 'center'
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                >
                    <motion.span
                        style={{
                            fontSize: '14px',
                            color: '#374151',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                        whileHover={{ scale: 1.05, color: '#2563eb' }}
                        onClick={handleForgotPassword}
                    >
                        Forgot Password?
                    </motion.span>

                    <div style={{ display: 'flex', gap: '4px', fontSize: '14px' }}>
                        <span style={{ color: '#6b7280' }}>Don't have an account?</span>
                        <motion.span
                            style={{
                                color: '#2563eb',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                            whileHover={{ scale: 1.05 }}
                            onClick={handleSignup}
                        >
                            Sign up
                        </motion.span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Login;
