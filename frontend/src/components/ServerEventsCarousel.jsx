import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Megaphone, AlertTriangle, Image as ImageIcon, RefreshCw, Loader } from 'lucide-react';

const CACHE_KEY = 'server_events_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const ServerEventsCarousel = ({ events: propEvents = [], onEventUpdate }) => {
    const [events, setEvents] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const fetchInProgress = useRef(false);

    // Get cached events from localStorage
    const getCachedEvents = useCallback(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                const now = Date.now();
                // Check if cache is still valid
                if (parsed.timestamp && (now - parsed.timestamp) < CACHE_EXPIRY_MS) {
                    return parsed.events || [];
                }
            }
        } catch (e) {
            console.error('Error reading cached events:', e);
        }
        return null;
    }, []);

    // Save events to localStorage cache
    const setCachedEvents = useCallback((eventsData) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                events: eventsData,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Error caching events:', e);
        }
    }, []);

    // Fetch events from API (non-blocking)
    const fetchEvents = useCallback(async (forceRefresh = false) => {
        // Prevent concurrent fetches
        if (fetchInProgress.current) return;

        // Check cache first unless forcing refresh
        if (!forceRefresh) {
            const cached = getCachedEvents();
            if (cached && cached.length > 0) {
                setEvents(cached);
                setIsLoading(false);
                return;
            }
        }

        fetchInProgress.current = true;

        try {
            const token = localStorage.getItem('session_token');
            if (!token) {
                // No token, use prop events or cached
                if (propEvents && propEvents.length > 0) {
                    setEvents(propEvents);
                    setCachedEvents(propEvents);
                }
                setIsLoading(false);
                fetchInProgress.current = false;
                return;
            }

            const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${apiUrl}/api/v1/dashboard/data`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const serverEvents = data?.server_events?.events || [];

                if (serverEvents.length > 0) {
                    setEvents(serverEvents);
                    setCachedEvents(serverEvents);
                    setError(null);
                } else if (propEvents && propEvents.length > 0) {
                    // Fallback to prop events
                    setEvents(propEvents);
                    setCachedEvents(propEvents);
                }
            } else {
                // On error, use cached or prop events
                const cached = getCachedEvents();
                if (cached && cached.length > 0) {
                    setEvents(cached);
                } else if (propEvents && propEvents.length > 0) {
                    setEvents(propEvents);
                }
            }
        } catch (e) {
            console.error('Error fetching server events:', e);
            setError('Failed to load events');
            // Use cached or prop events as fallback
            const cached = getCachedEvents();
            if (cached && cached.length > 0) {
                setEvents(cached);
            } else if (propEvents && propEvents.length > 0) {
                setEvents(propEvents);
            }
        } finally {
            setIsLoading(false);
            fetchInProgress.current = false;
        }
    }, [propEvents, getCachedEvents, setCachedEvents]);

    // Initial load - use cache immediately, then fetch in background
    useEffect(() => {
        // Immediately show cached data if available
        const cached = getCachedEvents();
        if (cached && cached.length > 0) {
            setEvents(cached);
            setIsLoading(false);
        } else if (propEvents && propEvents.length > 0) {
            // Use prop events if no cache
            setEvents(propEvents);
            setCachedEvents(propEvents);
            setIsLoading(false);
        }

        // Fetch fresh data in background (non-blocking)
        fetchEvents(false);
    }, []); // Only run on mount

    // Update when propEvents change (non-blocking)
    useEffect(() => {
        if (propEvents && propEvents.length > 0) {
            // Update cache and state with new prop events
            setEvents(propEvents);
            setCachedEvents(propEvents);
            setIsLoading(false);
        }
    }, [propEvents, setCachedEvents]);

    // Auto-play functionality
    useEffect(() => {
        if (isAutoPlaying && events.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prevIndex) =>
                    prevIndex === events.length - 1 ? 0 : prevIndex + 1
                );
            }, 5000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isAutoPlaying, events.length]);

    // Stop auto-play on user interaction
    const handleUserInteraction = () => {
        setIsAutoPlaying(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    // Navigation functions
    const goToPrevious = () => {
        handleUserInteraction();
        setCurrentIndex(currentIndex === 0 ? events.length - 1 : currentIndex - 1);
    };

    const goToNext = () => {
        handleUserInteraction();
        setCurrentIndex(currentIndex === events.length - 1 ? 0 : currentIndex + 1);
    };

    const goToSlide = (index) => {
        handleUserInteraction();
        setCurrentIndex(index);
    };

    // Touch handlers for swipe
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        touchEndX.current = e.changedTouches[0].clientX;
        handleSwipe();
    };

    const handleSwipe = () => {
        const swipeThreshold = 50;
        const swipeDistance = touchStartX.current - touchEndX.current;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                goToNext();
            } else {
                goToPrevious();
            }
        }
    };

    // Manual refresh
    const handleRefresh = () => {
        setIsLoading(true);
        fetchEvents(true);
        if (onEventUpdate) {
            onEventUpdate();
        }
    };

    // Get event type icon and color
    const getEventTypeDisplay = (eventType) => {
        switch (eventType) {
            case 'notification':
                return {
                    icon: AlertTriangle,
                    color: 'text-red-500',
                    bgColor: 'bg-red-50'
                };
            case 'picture':
                return {
                    icon: ImageIcon,
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-50'
                };
            case 'text':
            default:
                return {
                    icon: Megaphone,
                    color: 'text-green-500',
                    bgColor: 'bg-green-50'
                };
        }
    };

    // Loading state
    if (isLoading && events.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader className="w-8 h-8 text-green-500 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Events...</h3>
                <p className="text-gray-500 text-sm">Fetching the latest updates and announcements.</p>
            </div>
        );
    }

    // Empty state
    if (!isLoading && (!events || events.length === 0)) {
        return (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Megaphone className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Events Available</h3>
                <p className="text-gray-500 text-sm mb-4">Check back later for updates and announcements.</p>
                <button
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>
        );
    }

    const currentEvent = events[currentIndex];
    if (!currentEvent) {
        return null;
    }

    const eventDisplay = getEventTypeDisplay(currentEvent.event_type);

    return (
        <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-green-600" />
                    Announcements
                    {isLoading && (
                        <Loader className="w-4 h-4 text-green-500 animate-spin ml-2" />
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Refresh events"
                        title="Refresh events"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {events.length > 1 && (
                        <>
                            <button
                                onClick={goToPrevious}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Previous event"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <div className="flex gap-1">
                                {events.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToSlide(index)}
                                        className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                        aria-label={`Go to event ${index + 1}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={goToNext}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Next event"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div
                className="relative overflow-hidden cursor-pointer"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Event Card */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-all transform hover:scale-[1.02]">
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${eventDisplay.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <eventDisplay.icon className={`w-5 h-5 ${eventDisplay.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                                {currentEvent.title}
                            </h4>

                            {currentEvent.content && (
                                <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                                    {currentEvent.content}
                                </p>
                            )}

                            {currentEvent.image_url && (
                                <div className="mt-3">
                                    <img
                                        src={currentEvent.image_url}
                                        alt={currentEvent.title}
                                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}

                            <div className="mt-3 text-xs text-gray-500">
                                {new Date(currentEvent.updated_at || currentEvent.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress indicator for auto-play */}
                {isAutoPlaying && events.length > 1 && (
                    <div className="mt-3 bg-gray-200 rounded-full h-1 overflow-hidden">
                        <div
                            className="bg-green-500 h-1 rounded-full transition-all duration-100 ease-linear"
                            style={{
                                width: '0%',
                                animation: 'progress 5s linear infinite'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Add progress animation CSS */}
            <style jsx>{`
                @keyframes progress {
                    0% { width: 100%; }
                    100% { width: 0%; }
                }
            `}</style>
        </div>
    );
};

export default ServerEventsCarousel;
