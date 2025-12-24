import React, { useState, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from './services/api';
import useAuth from './hooks/useAuth';
import Loader from './loader';
import './GetStarted-responsive.css';
import './GetStarted-media.css';

export default function GetStarted() {
  const [hoveredButton, setHoveredButton] = useState(null);
  const { isLoading, isAuthenticated, hasInvestorAccount, refresh } = useAuth();
  const cardRotateX = useSpring(0);
  const cardRotateY = useSpring(0);

  const handleCardMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateX = (event.clientY - centerY) / 10;
    const rotateY = (centerX - event.clientX) / 10;

    cardRotateX.set(rotateX);
    cardRotateY.set(rotateY);
  };


  const handleCardMouseLeave = () => {
    cardRotateX.set(0);
    cardRotateY.set(0);
  };

  const navigate = useNavigate();

  // useAuth handles initial check and listens for dashboard:refreshed events

  const handleGetStarted = () => {
    if (hasInvestorAccount) {
      navigate('/dashboard');
    } else {
      navigate('/open-account-wizard');
    }
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  return (
    <div className="get-started-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 30%, #059669 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '40px 24px 32px 24px',
      fontFamily: '"Lexend Deca", -apple-system, BlinkMacSystemFont, sans-serif',
      color: 'white',
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      {/* Background decorative elements */}
      <motion.div
        style={{
          position: 'absolute',
          top: '20%',
          right: '-10%',
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
          bottom: '30%',
          left: '-5%',
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

      {/* Card Section */}
      <motion.div
        style={{
          marginTop: '60px',
          perspective: '1000px'
        }}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 1,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        <motion.div
          style={{
            transformStyle: 'preserve-3d',
            cursor: 'pointer'
          }}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
          whileHover={{ scale: 1.05 }}
          animate={{
            rotateX: cardRotateX,
            rotateY: cardRotateY
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Credit Card */}
          <div style={{
            width: '300px',
            height: '190px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '20px',
            position: 'relative',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), 0 10px 20px rgba(59, 130, 246, 0.1)',
            overflow: 'hidden',
            border: 'none'
          }}>
            {/* Card shine effect */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                zIndex: 1
              }}
              animate={{
                left: ['100%', '-100%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 2
              }}
            />

            {/* Chip */}
            <div style={{
              position: 'absolute',
              top: '24px',
              left: '24px',
              width: '40px',
              height: '32px',
              background: 'linear-gradient(145deg, #f0f0f0, #d0d0d0)',
              borderRadius: '6px',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1)',
              zIndex: 2
            }} />

            {/* Card Number */}
            <div style={{
              position: 'absolute',
              bottom: '50px',
              left: '24px',
              fontSize: '18px',
              fontWeight: '500',
              letterSpacing: '2px',
              color: 'white',
              fontFamily: '"Lexend Deca", monospace',
              zIndex: 2
            }}>
              5678 9012 3456 7890
            </div>

            {/* Coins */}
            <motion.div
              style={{
                position: 'absolute',
                top: '-10px',
                right: '20px',
                zIndex: 3
              }}
              animate={{
                y: [0, -5, 0],
                rotate: [0, 5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(145deg, #84cc16, #65a30d)',
                borderRadius: '50%',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                position: 'relative'
              }}>
                {/* Coin notches */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: '2px',
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.4)',
                    top: '4px',
                    left: '50%',
                    transformOrigin: '1px 26px',
                    transform: `translateX(-50%) rotate(${i * 30}deg)`
                  }} />
                ))}
              </div>
              <motion.div
                style={{
                  width: '45px',
                  height: '45px',
                  background: 'linear-gradient(145deg, #a3e635, #84cc16)',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '20px',
                  right: '-15px',
                  boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
                  border: '2px solid rgba(255, 255, 255, 0.2)'
                }}
                animate={{
                  y: [0, -3, 0],
                  rotate: [0, -3, 0]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: '1.5px',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.3)',
                    top: '3px',
                    left: '50%',
                    transformOrigin: '0.75px 19px',
                    transform: `translateX(-50%) rotate(${i * 36}deg)`
                  }} />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Text Section */}
      <motion.div
        style={{
          textAlign: 'center',
          maxWidth: '320px',
          margin: '40px 0'
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.8,
          duration: 0.8,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            lineHeight: '1.2',
            marginBottom: '12px',
            fontFamily: '"Lexend Deca", sans-serif',
            color: 'white'
          }}
        >
          Welcome to the<br />Future of Investments
        </h1>

        <motion.p
          style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: '1.5',
            fontWeight: '400'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          Empowering the next millionaires in the simplest aspect of ways. Earn Rewards, dividends and interests on your savings let your money work for you
        </motion.p>
      </motion.div>

      {/* Button Section */}
      <motion.div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
          maxWidth: '300px'
        }}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 1.4,
          duration: 0.8,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        {/* Conditionally render a single action button based on session state */}
        {isLoading ? (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Loader text="Checking your account..." size="small" transparent={true} />
          </div>
        ) : isAuthenticated ? (
          <motion.button
            style={{
              background: 'linear-gradient(135deg, #84cc16, #65a30d)',
              color: '#1a1a1a',
              fontSize: '16px',
              fontWeight: '600',
              padding: '16px 32px',
              borderRadius: '50px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: '"Lexend Deca", sans-serif',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 25px rgba(132, 204, 22, 0.3)'
            }}
            onHoverStart={() => setHoveredButton('primary')}
            onHoverEnd={() => setHoveredButton(null)}
            onClick={handleGetStarted}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 12px 35px rgba(132, 204, 22, 0.4)'
            }}
            whileTap={{ scale: 0.98 }}
            animate={{
              boxShadow: hoveredButton === 'primary'
                ? '0 12px 35px rgba(132, 204, 22, 0.4)'
                : '0 8px 25px rgba(132, 204, 22, 0.3)'
            }}
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
                left: hoveredButton === 'primary' ? '100%' : '-100%'
              }}
              transition={{ duration: 0.6 }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>Get Started</span>
          </motion.button>
        ) : !isAuthenticated ? (
          <motion.button
            style={{
              background: 'transparent',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              padding: '16px 32px',
              borderRadius: '50px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              fontFamily: '"Lexend Deca", sans-serif',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onHoverStart={() => setHoveredButton('secondary')}
            onHoverEnd={() => setHoveredButton(null)}
            whileHover={{
              scale: 1.02,
              borderColor: 'rgba(255, 255, 255, 0.6)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}
            onClick={handleSignIn}
            whileTap={{ scale: 0.98 }}
            animate={{
              borderColor: hoveredButton === 'secondary'
                ? 'rgba(255, 255, 255, 0.6)'
                : 'rgba(255, 255, 255, 0.3)',
              backgroundColor: hoveredButton === 'secondary'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'transparent'
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
              }}
              animate={{
                left: hoveredButton === 'secondary' ? '100%' : '-100%'
              }}
              transition={{ duration: 0.8 }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>Login</span>
          </motion.button>
        ) : (
          // Fallback (shouldn't normally reach here) — keep layout stable
          <div style={{ height: '56px' }} />
        )}
      </motion.div>
    </div>
  );
}
