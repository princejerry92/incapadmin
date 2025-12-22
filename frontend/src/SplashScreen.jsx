// src/pages/SplashScreen.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ServerError from "./ServerError";

// Replace with your actual logo asset path
import logo from "./assets/Blue Gold.png";

export default function SplashScreen() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(true);
  const [networkAvailable, setNetworkAvailable] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    checkNetworkConnectivity();
  }, []);

  // Navigate to login once network check succeeds
  useEffect(() => {
    if (networkAvailable === true && progress === 100) {
      const timer = setTimeout(() => {
        navigate('/admin/login');
      }, 1000); // Brief delay to show 100% progress

      return () => clearTimeout(timer);
    }
  }, [networkAvailable, progress, navigate]);

  const checkNetworkConnectivity = async () => {
    setIsCheckingNetwork(true);
    setProgress(0);

    // First check basic online status
    if (!navigator.onLine) {
      setNetworkAvailable(false);
      setIsCheckingNetwork(false);
      return;
    }

    // Simulate progress while checking
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 70));
    }, 200);

    try {
      // Try to ping the backend API to check if server is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      // Extract origin for health check if it's not a versioned path, 
      // or just use the base URL. Usually health is at root.
      const healthUrl = API_BASE_URL.replace('/api/v1', '') + '/health';

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      setProgress(100);

      // Small delay to show 100% progress
      setTimeout(() => {
        setNetworkAvailable(response.ok);
        setIsCheckingNetwork(false);
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      setNetworkAvailable(false);
      setIsCheckingNetwork(false);
    }
  };

  // Show error screen if network check failed
  if (networkAvailable === false) {
    return <ServerError />;
  }

  // Show loading progress while checking, or while we have success but
  // the progress animation hasn't reached 100 yet. When networkAvailable
  // is true and progress === 100, the effect below will navigate to /login
  // so we should not keep rendering the splash screen indefinitely.
  if (isCheckingNetwork || (networkAvailable === true && progress < 100)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#f1f0e9ff",
          padding: "20px",
        }}
      >
        <motion.img
          src={logo}
          alt="Blue Gold Logo"
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.25)",
          }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{
            marginTop: 20,
            fontWeight: "bold",
            fontSize: isMobile ? "1.25rem" : "1.5rem",
            textAlign: "center"
          }}
        >
          <span style={{ color: "blue" }}>Blue</span> <span style={{ color: "gold" }}>Gold</span>
        </motion.h1>

        <motion.div
          style={{
            marginTop: '40px',
            width: '100%',
            maxWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <motion.div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #84cc16, #22c55e)',
                borderRadius: '2px'
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <motion.p
            style={{
              fontSize: '16px',
              color: '#6b7280',
              fontWeight: '500',
              textAlign: 'center'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.3 }}
          >
            {isCheckingNetwork
              ? "Checking network connection..."
              : networkAvailable
                ? "Loading login page..."
                : "No network connection"
            }
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return null; // This should never be reached
}