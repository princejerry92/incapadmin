import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardAPI, getSessionToken, setSessionToken } from './services/api';
import cacheService from './services/cache';
import Loader from './loader.jsx';
import './global-styles.css';
import TransactionHistory from './components/TransactionHistory';
import WithdrawalModal from './components/WithdrawalModal';
import TopUpModal from './components/TopUpModal';
import RenewModal from './components/RenewModal';
import DueDateCalendar from './components/DueDateCalendar';
import NotificationDropdown from './components/NotificationDropdown';
import OfflineError from './components/OfflineError';
import ProfileDropdown from './components/ProfileDropdown';
import UnderDevelopmentOverlay from './components/UnderDevelopmentOverlay';
import Goals from './Goals';
import GoalsSummary from './components/GoalsSummary';
import InvestmentAnalyticsSection from './components/InvestmentAnalyticsSection';
import ServerEventsCarousel from './components/ServerEventsCarousel';
import ErrorBoundary from './ErrorBoundary';
import CustomerCare from './components/CustomerCare';
import SessionExpiredModal from './components/SessionExpiredModal';
import { useNotifications } from './hooks/useNotifications';
import {
    Home,
    CreditCard,
    Calendar,
    TrendingUp,
    Plus,
    Eye,
    DollarSign,
    RotateCcw,
    ArrowUp,
    User,
    Settings,
    Bell,
    Search,
    Target,
    PieChart,
    BarChart3,
    Wallet,
    ChevronDown,
    X,
    CheckCircle,
    ArrowRight,
    Sparkles,
    TrendingDown,
    Clock,
    Headphones
} from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showAddModal, setShowAddModal] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [showPaymentNotification, setShowPaymentNotification] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [cacheAge, setCacheAge] = useState(0);
    const [showUpdateNotification, setShowUpdateNotification] = useState(false);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [isWithdrawalProcessing, setIsWithdrawalProcessing] = useState(false);
    const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
    const [showDueDateCalendar, setShowDueDateCalendar] = useState(false);
    const [showUnderDevelopmentOverlay, setShowUnderDevelopmentOverlay] = useState(false);
    const [renewalDate, setRenewalDate] = useState(null);
    const [reportIssueData, setReportIssueData] = useState(null);
    const [isEligibleForRenewal, setIsEligibleForRenewal] = useState(false);
    const [activeSection, setActiveSection] = useState('home');
    const [showSensitive, setShowSensitive] = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const [monthlySummary, setMonthlySummary] = useState(null);
    const [monthlySummaryLoading, setMonthlySummaryLoading] = useState(true);
    const [monthlySummaryError, setMonthlySummaryError] = useState(null);
    const [showCustomerCare, setShowCustomerCare] = useState(false);
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
    const [transactionsExpanded, setTransactionsExpanded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const {
        notifications,
        unreadCount,
        loading: notificationsLoading,
        error: notificationsError,
        addNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        refresh: refreshNotifications
    } = useNotifications();

    // Listen for notification creation events
    useEffect(() => {
        const handleNotificationCreated = (event) => {
            console.log('Notification created:', event.detail);
            // Refresh notifications after a new one is created
            if (refreshNotifications) {
                setTimeout(() => refreshNotifications(), 500); // Small delay to ensure backend has processed
            }
        };

        window.addEventListener('notification:created', handleNotificationCreated);
        return () => window.removeEventListener('notification:created', handleNotificationCreated);
    }, [refreshNotifications]);

    const handlemyCards = () => navigate('/my-cards');
    const handleDiscover = () => navigate('/discover');
    const handleDueDates = () => setShowDueDateCalendar(true);
    const handleGoals = () => navigate('/goals');
    const handleCloseDueDateCalendar = () => setShowDueDateCalendar(false);
    const handleCloseProfileDropdown = () => setShowProfileDropdown(false);
    const handleOpenProfileDropdown = () => setShowProfileDropdown(true);

    const handleReportIssue = (reportData) => {
        setReportIssueData(reportData);
        setShowCustomerCare(true);
    };

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle network errors
    useEffect(() => {
        const handleNetworkError = () => {
            setNetworkError(true);
            // Try to use cached data if available
            const cachedData = cacheService.getDashboardData();
            if (cachedData) {
                setDashboardData(cachedData);
                setLastUpdate(cachedData._lastUpdate);
                setCacheAge(cachedData._cacheAge);
            }
        };

        window.addEventListener('network:error', handleNetworkError);
        return () => window.removeEventListener('network:error', handleNetworkError);
    }, []);


    const fetchDashboardData = async (useCache = true) => {
        let token = getSessionToken();
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            if (useCache) {
                const cachedData = cacheService.getDashboardData();
                if (cachedData) {
                    setDashboardData(cachedData);
                    setLastUpdate(cachedData._lastUpdate);
                    setCacheAge(cachedData._cacheAge);
                    setLoading(false);
                } else {
                    setLoading(true);
                }
            } else {
                setIsRefreshing(true);
            }

            setNetworkError(false);

            const data = await dashboardAPI.getDashboardData(useCache);
            if (data.success) {
                setDashboardData(data);
                if (!data._cached) {
                    setLastUpdate(Date.now());
                    setCacheAge(0);
                } else {
                    setLastUpdate(data._lastUpdate);
                    setCacheAge(data._cacheAge);
                }
                if (data.notifications && data.notifications.length > 0) {
                    addNotifications(data.notifications);
                }
            } else {
                if (!dashboardData && !useCache) {
                    setError(data.error || 'Failed to load dashboard data');
                }
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
            const cachedData = cacheService.getDashboardData();
            if (cachedData && useCache) {
                setDashboardData(cachedData);
                setLastUpdate(cachedData._lastUpdate);
                setCacheAge(cachedData._cacheAge);
            } else if (!useCache) {
                alert('Refresh failed: ' + (err.message || 'Server unreachable'));
            } else {
                setError(err.message || 'Failed to load dashboard data');
            }

            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                setShowSessionExpiredModal(true);
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleManualRefresh = () => {
        if (isRefreshing) return;
        fetchDashboardData(false);
    };

    // Unified effect to handle URL parameters (session_token, payment) and data fetching
    useEffect(() => {
        const processUrlParams = async () => {
            const currentParams = new URLSearchParams(window.location.search);
            let paramsChanged = false;

            // 1. Handle session_token
            const urlToken = currentParams.get('session_token');
            if (urlToken) {
                setSessionToken(urlToken);
                currentParams.delete('session_token');
                paramsChanged = true;
            }

            // 2. Handle payment status
            const payment = currentParams.get('payment');
            if (payment) {
                setPaymentStatus(payment);
                setShowPaymentNotification(true);
                currentParams.delete('payment');
                paramsChanged = true;
                setTimeout(() => setShowPaymentNotification(false), 5000);
            }

            // 3. Update URL if parameters changed
            if (paramsChanged) {
                setSearchParams(currentParams);
            }

            // 4. Initial Fetch
            fetchDashboardData(true);
        };

        processUrlParams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    useEffect(() => {
        const handleDashboardRefresh = (event) => {
            const { lastUpdate, cacheAge } = event.detail;
            setLastUpdate(lastUpdate);
            setCacheAge(cacheAge);
            setShowUpdateNotification(true);
            setTimeout(() => setShowUpdateNotification(false), 3000);

            const freshData = cacheService.getDashboardData();
            if (freshData) {
                setDashboardData(freshData);
            }
        };

        window.addEventListener('dashboard:refreshed', handleDashboardRefresh);
        return () => window.removeEventListener('dashboard:refreshed', handleDashboardRefresh);
    }, []);

    useEffect(() => {
        // Choose canonical investment source: prefer investments[0], then investment
        const invSource = (Array.isArray(dashboardData?.investments) && dashboardData.investments[0]) || dashboardData?.investment;
        if (invSource) {
            const investment = invSource;
            const portfolioType = investment.portfolio_type;
            const investmentType = investment.investment_type;
            const startDate = investment.created_at;

            if (!investmentType || investmentType === 'Not Selected') {
                setIsEligibleForRenewal(false);
                setRenewalDate(null);
                return;
            }

            let expiryWeeks = 0;
            const portfolioRules = {
                'Conservative': { 'Gold Starter': 20, 'Gold Flair': 20 },
                'Balanced': { 'Gold Starter': 12, 'Gold Flair': 12, 'Gold Accent': 12 },
                'Growth': { 'Gold Starter': 8, 'Gold Flair': 9, 'Gold Accent': 9, 'Gold Luxury': 9 }
            };

            if (portfolioRules[portfolioType] && portfolioRules[portfolioType][investmentType]) {
                expiryWeeks = portfolioRules[portfolioType][investmentType];
            }

            if (expiryWeeks === 0) {
                setIsEligibleForRenewal(false);
                setRenewalDate(null);
                return;
            }

            if (startDate) {
                const startDateObj = new Date(startDate);
                const expiryDate = new Date(startDateObj);
                expiryDate.setDate(expiryDate.getDate() + (expiryWeeks * 7));
                setRenewalDate(expiryDate);
                setIsEligibleForRenewal(new Date() >= expiryDate);
            } else {
                setIsEligibleForRenewal(false);
                setRenewalDate(null);
                return;
            }
        } else {
            setIsEligibleForRenewal(false);
            setRenewalDate(null);
        }
    }, [dashboardData]);

    // Fetch monthly transaction summary
    useEffect(() => {
        const fetchMonthlySummary = async () => {
            if (!dashboardData) return; // Wait for dashboard data to load first

            try {
                setMonthlySummaryLoading(true);
                setMonthlySummaryError(null);

                const summaryResult = await dashboardAPI.getMonthlyTransactionSummary();

                if (summaryResult.success) {
                    setMonthlySummary(summaryResult.data);
                } else {
                    setMonthlySummaryError(summaryResult.error || 'Failed to load monthly summary');
                }
            } catch (error) {
                console.error('Error fetching monthly summary:', error);
                setMonthlySummaryError('Failed to load monthly summary');
            } finally {
                setMonthlySummaryLoading(false);
            }
        };

        fetchMonthlySummary();
    }, [dashboardData]);

    // Refresh monthly summary when transactions are updated
    useEffect(() => {
        const handleTransactionUpdate = () => {
            // Refresh monthly summary when transactions change
            const refreshSummary = async () => {
                try {
                    const summaryResult = await dashboardAPI.getMonthlyTransactionSummary();
                    if (summaryResult.success) {
                        setMonthlySummary(summaryResult.data);
                    }
                } catch (error) {
                    console.error('Error refreshing monthly summary:', error);
                }
            };
            refreshSummary();
        };

        window.addEventListener('dashboard:refreshed', handleTransactionUpdate);
        return () => window.removeEventListener('dashboard:refreshed', handleTransactionUpdate);
    }, []);

    // Monthly refresh logic - check for new month every hour
    useEffect(() => {
        const checkMonthlyRefresh = () => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Check if we have a stored month/year from last check
            const storedMonth = localStorage.getItem('lastMonthlyCheckMonth');
            const storedYear = localStorage.getItem('lastMonthlyCheckYear');

            if (storedMonth && storedYear) {
                const lastMonth = parseInt(storedMonth);
                const lastYear = parseInt(storedYear);

                // If we've moved to a new month, refresh the monthly summary
                if (currentMonth !== lastMonth || currentYear !== lastYear) {
                    const refreshSummary = async () => {
                        try {
                            setMonthlySummaryLoading(true);
                            const summaryResult = await dashboardAPI.getMonthlyTransactionSummary();
                            if (summaryResult.success) {
                                setMonthlySummary(summaryResult.data);
                            }
                        } catch (error) {
                            console.error('Error refreshing monthly summary for new month:', error);
                        } finally {
                            setMonthlySummaryLoading(false);
                        }
                    };
                    refreshSummary();
                }
            }

            // Update stored month/year
            localStorage.setItem('lastMonthlyCheckMonth', currentMonth.toString());
            localStorage.setItem('lastMonthlyCheckYear', currentYear.toString());
        };

        // Check immediately
        checkMonthlyRefresh();

        // Set up hourly check
        const interval = setInterval(checkMonthlyRefresh, 60 * 60 * 1000); // Check every hour

        return () => clearInterval(interval);
    }, []);

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleWithdrawal = async (amount, pin) => {
        try {
            setIsWithdrawalProcessing(true);
            setWithdrawalSuccess(true);
            setShowWithdrawalModal(false);
            alert(`Withdrawal request for ${formatCurrency(amount)} submitted successfully! Processing fee of ₦500 deducted. Your funds will be available within 5 minutes to 3 business days.`);
            const freshData = await dashboardAPI.getDashboardData(false);
            if (freshData.success) {
                setDashboardData(freshData);
            }
        } catch (error) {
            throw new Error('Failed to process withdrawal');
        } finally {
            setIsWithdrawalProcessing(false);
        }
    };

    const handleTopUp = async (amount) => {
        try {
            setShowTopUpModal(false);
            const freshData = await dashboardAPI.getDashboardData(false);
            if (freshData.success) {
                setDashboardData(freshData);
            }
            if (amount && !isNaN(amount)) {
                alert(`Top-up request for ${formatCurrency(amount)} submitted successfully!`);
            } else {
                alert(`Top-up request submitted successfully!`);
            }
        } catch (error) {
            throw new Error('Failed to process top-up');
        }
    };

    const handleRenewClick = () => {
        if (isEligibleForRenewal) {
            setShowRenewModal(true);
        } else {
            const renewalMsg = renewalDate
                ? `Your investment isn't due for renewal yet. Please try again on ${formatDate(renewalDate)}.`
                : "Your investment isn't eligible for renewal at this time.";
            alert(renewalMsg);
        }
    };

    const handleRenew = async (renewType) => {
        try {
            setShowRenewModal(false);
            if (renewType === 'end') {
                alert('Investment ended successfully. 75% of your initial deposit has been transferred to your spending account.');
            } else if (renewType === 'renew') {
                alert('Investment renewed successfully. You can now select a new investment type.');
            }
            const freshData = await dashboardAPI.getDashboardData(false);
            if (freshData.success) {
                setDashboardData(freshData);
            }
        } catch (error) {
            throw new Error('Failed to process renewal');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount || 0).replace('NGN', '₦');
    };

    const timeAgo = (timestamp) => {
        if (!timestamp) return '';
        const now = Date.now();
        const diff = Math.max(0, now - timestamp);
        const sec = Math.floor(diff / 1000);
        const min = Math.floor(sec / 60);
        const hr = Math.floor(min / 60);
        const day = Math.floor(hr / 24);
        if (sec < 60) return `${sec}s ago`;
        if (min < 60) return `${min}m ago`;
        if (hr < 24) return `${hr}h ago`;
        if (day < 7) return `${day}d ago`;
        const d = new Date(timestamp);
        return d.toLocaleString();
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const getUserName = () => {
        if (!dashboardData?.user) return 'User';
        const { first_name, surname, full_name } = dashboardData.user;
        return full_name || `${first_name || ''} ${surname || ''}`.trim() || 'User';
    };

    const getProfilePic = () => dashboardData?.user?.profile_pic || null;
    const getInvestmentBalance = () => dashboardData?.investment?.total_balance || 0;
    // Spending balance should be derived from whichever source the backend provides.
    // Prefer explicit user spending balance, then investment.spending_balance, then due_dates amount, and finally fallback to total_due.
    const getSpendingBalance = () => {
        if (!dashboardData) return 0;
        // user-level canonical spending account field
        if (typeof dashboardData.user?.spending_account_balance === 'number') return dashboardData.user.spending_account_balance;
        if (dashboardData.user?.spending_account_balance) return parseFloat(dashboardData.user.spending_account_balance) || 0;

        // common investment-level fields
        if (typeof dashboardData.investment?.spending_balance === 'number') return dashboardData.investment.spending_balance;
        if (dashboardData.investment?.spending_balance) return parseFloat(dashboardData.investment.spending_balance) || 0;

        // some endpoints provide amount_due inside due_dates
        if (typeof dashboardData.due_dates?.amount_due === 'number') return dashboardData.due_dates.amount_due;
        if (dashboardData.due_dates?.amount_due) return parseFloat(dashboardData.due_dates.amount_due) || 0;

        // older / less explicit field names — fall back to total_due
        if (typeof dashboardData.investment?.total_due === 'number') return dashboardData.investment.total_due;
        if (dashboardData.investment?.total_due) return parseFloat(dashboardData.investment.total_due) || 0;

        // If there is an array of investments choose the first one
        if (Array.isArray(dashboardData.investments) && dashboardData.investments[0]) {
            const inv = dashboardData.investments[0];
            if (typeof inv.spending_balance === 'number') return inv.spending_balance;
            if (inv.spending_balance) return parseFloat(inv.spending_balance) || 0;
            if (typeof inv.total_due === 'number') return inv.total_due;
            if (inv.total_due) return parseFloat(inv.total_due) || 0;
        }

        return 0;
    };
    const getAccountNumber = () => {
        const accountNum = dashboardData?.investment?.primary_account || '****';
        if (accountNum.length > 4) {
            return accountNum.slice(-4);
        }
        return accountNum;
    };
    const getPortfolioType = () => dashboardData?.investment?.portfolio_type || 'N/A';
    const getInvestmentType = () => dashboardData?.investment?.investment_type || 'Not Selected';
    const hasInvestmentType = () => {
        return dashboardData?.investment?.investment_type && dashboardData?.investment?.investment_type !== 'Not Selected';
    };

    const transactions = dashboardData?.transactions || [
        { id: 1, type: 'Paystack Payment', amount: 'N500,000.34', date: '27 August 2024', time: '12:49 PM', status: 'Received' },
        { id: 2, type: 'Netflix Subscription', amount: 'N3,200.00', date: '26 August 2024', time: '10:30 AM', status: 'Sent' },
        { id: 3, type: 'Grocery Shopping', amount: 'N15,450.20', date: '25 August 2024', time: '3:15 PM', status: 'Sent' }
    ];

    const quickActions = [
        { icon: DollarSign, label: 'Pay', color: 'bg-gradient-to-br from-green-400 to-green-600', onClick: () => setShowUnderDevelopmentOverlay(true) },
        {
            icon: CreditCard,
            label: 'Withdraw',
            color: 'bg-gradient-to-br from-blue-400 to-blue-600',
            onClick: () => setShowWithdrawalModal(true)
        },
        {
            icon: RotateCcw,
            label: 'Renew',
            color: isEligibleForRenewal ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gray-300',
            onClick: handleRenewClick,
            disabled: !isEligibleForRenewal
        },
        {
            icon: ArrowUp,
            label: 'Top up',
            color: 'bg-gradient-to-br from-orange-400 to-orange-600',
            onClick: () => setShowTopUpModal(true)
        }
    ];

    const addMenuItems = [
        { icon: CreditCard, label: 'Add Card', desc: 'Link a new payment card', onClick: handlemyCards },
        { icon: Search, label: 'Discover', desc: 'Explore new investment options', onClick: handleDiscover },
        { icon: Calendar, label: 'Due Dates', desc: 'Manage payment schedules and returns', onClick: handleDueDates },
        { icon: Target, label: 'Goals', desc: 'View investment journey and goals', onClick: handleGoals },
        { icon: Headphones, label: 'Customer Care', desc: 'Get help and support', onClick: () => setShowCustomerCare(true) },
        { icon: Plus, label: 'Add Account', desc: 'Create a new investment account', onClick: () => alert('Add Account feature coming soon') },
        { icon: X, label: 'Delete Account', desc: 'Permanently delete your account', onClick: () => alert('Delete Account feature coming soon') },
        {
            icon: () => (
                <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">₦</span>
                </div>
            ),
            label: 'Affiliate Network',
            desc: 'Manage your referral points and downlines',
            onClick: () => navigate('/affiliate-network')
        }
    ];

    // Ensure defined before usage in sidebarItems
    const scrollToAnalytics = () => {
        const analyticsSection = document.getElementById('analytics-section');
        if (analyticsSection) {
            analyticsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection('analytics');
        }
    };

    const sidebarItems = [
        { icon: Home, label: 'Dashboard', active: activeSection === 'home', onClick: () => setActiveSection('home') },
        { icon: Wallet, label: 'Wallet', active: activeSection === 'wallet', onClick: () => setActiveSection('wallet') },
        { icon: CreditCard, label: 'Cards', onClick: handlemyCards },
        { icon: TrendingUp, label: 'Analytics', active: activeSection === 'analytics', onClick: scrollToAnalytics },
        { icon: Calendar, label: 'Due Dates', onClick: handleDueDates },
        { icon: Search, label: 'Discover', onClick: handleDiscover },
        { icon: Target, label: 'Goals', onClick: handleGoals },
        { icon: Headphones, label: 'Customer Care', onClick: () => setShowCustomerCare(true) },
        {
            icon: () => (
                <div className="w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">₦</span>
                </div>
            ),
            label: 'Affiliate Network',
            onClick: () => navigate('/affiliate-network')
        },
        { icon: Plus, label: 'Add Account', onClick: () => alert('Add Account feature coming soon') },
        { icon: X, label: 'Delete Account', onClick: () => alert('Delete Account feature coming soon') },
        { icon: Settings, label: 'Settings' }
    ];

    // Safety timeout for loading state
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                if (loading) {
                    console.warn('[Dashboard] Loading timeout reached');
                    setLoading(false);
                    setError('Loading timed out. Please check your connection.');
                }
            }, 10000); // 10 seconds timeout
            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (networkError && !dashboardData) {
        return <OfflineError />;
    }

    if (loading && !dashboardData) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader text="Loading your dashboard..." />
            </div>
        );
    }

    if ((error && !dashboardData) || (!loading && !dashboardData && !error)) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <X className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        {error ? 'Error Loading Dashboard' : 'No Data Available'}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {error || 'Dashboard data could not be retrieved. Please try again.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-xl transition-all transform hover:scale-105 font-semibold"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="block w-full mt-4 text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Back to Login
                    </button>
                </div>
                <SessionExpiredModal
                    isOpen={showSessionExpiredModal}
                    onClose={() => setShowSessionExpiredModal(false)}
                />
            </div>
        );
    }

    if (isMobile) return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
            {/* Header - Improved */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-b-3xl shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="animate-fade-in">
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            {getGreeting()}
                            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                        </h1>
                        <p className="text-green-100">{getUserName()}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleManualRefresh}
                            className={`p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all transform hover:scale-110 flex items-center justify-center ${isRefreshing ? 'cursor-wait' : ''}`}
                            title="Refresh Dashboard"
                            disabled={isRefreshing}
                        >
                            <RotateCcw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin-slow' : ''}`} />
                        </button>
                        <NotificationDropdown
                            notifications={notifications}
                            unreadCount={unreadCount}
                            onMarkAsRead={markAsRead}
                            onMarkAllAsRead={markAllAsRead}
                            onDeleteNotification={deleteNotification}
                            onClearAllNotifications={clearAllNotifications}
                        />
                        <div
                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-md ring-2 ring-white ring-opacity-50 transition-transform hover:scale-110 cursor-pointer"
                            onClick={handleOpenProfileDropdown}
                        >
                            {getProfilePic() ? (
                                <img src={getProfilePic()} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-green-600" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Wallet Section - Enhanced */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-emerald-700 to-green-600 p-6 text-white shadow-2xl transform transition-all hover:scale-[1.02]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 shadow-xl opacity-5 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <p className="text-sm opacity-90 flex items-center gap-1">
                                    <Wallet className="w-4 h-4" />
                                    Investment Balance
                                </p>
                                <h3 className="text-3xl font-bold tracking-tight">{loading ? 'Loading...' : (showSensitive ? formatCurrency(getInvestmentBalance()) : '******')}</h3>
                                <p className="text-xs opacity-75 mt-1 flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    Spending: {loading ? '...' : (showSensitive ? formatCurrency(getSpendingBalance()) : '******')}
                                </p>
                                {lastUpdate && (
                                    <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Updated {timeAgo(lastUpdate)}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowDueDateCalendar(true)}
                                className="p-2 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 shadow-xl bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all transform hover:scale-110"
                            >
                                <Calendar className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex justify-between items-end mt-6 pt-4 border-t border-white border-opacity-20">
                            <div className="flex items-center space-x-2">
                                <span className="text-lg">{showSensitive ? 'ACCT' : '****'}</span>
                                <span className="text-lg font-semibold">{showSensitive ? (dashboardData?.investment?.primary_account || '****') : getAccountNumber()}</span>
                                <button
                                    aria-label={showSensitive ? 'Hide account details' : 'Show account details'}
                                    className="p-1 rounded-full hover:bg-white/10"
                                    onClick={() => setShowSensitive(v => !v)}
                                >
                                    <Eye className="w-4 h-4 opacity-75" />
                                </button>
                            </div>
                            <div className="text-xl font-bold tracking-wider">VISA</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Care Modal */}
            {showCustomerCare && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Customer Care</h2>
                            <button
                                onClick={() => setShowCustomerCare(false)}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4">
                            <CustomerCare />
                        </div>
                    </div>
                </div>
            )}

            {/* Portfolio Info - Compact for Mobile */}
            <div className="px-4 mb-6">
                <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-0.5">Portfolio</p>
                            <p className="font-semibold text-gray-900 text-sm truncate">{getPortfolioType()}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-0.5">Investment</p>
                            <p className="font-semibold text-gray-900 text-sm truncate">{getInvestmentType()}</p>
                        </div>
                        <div className="flex-shrink-0">
                            {hasInvestmentType() ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <button
                                    onClick={handleDiscover}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 rounded-lg"
                                >
                                    Select
                                </button>
                            )}
                        </div>
                    </div>
                    {!hasInvestmentType() && (
                        <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                            <button onClick={handleDiscover} className="font-medium underline">Choose investment type</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Goals Info - Mobile */}
            <div className="px-4 mb-6">
                <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 shadow-md border border-gray-100">
                    <GoalsSummary dashboardData={dashboardData} />
                </div>
            </div>

            {/* Investment Analytics - Mobile Optimized without Horizontal Scroll */}
            <div className="px-4 mb-6" id="analytics-section">
                <div className="bg-white rounded-2xl shadow-md p-4 overflow-hidden">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Investment Analytics
                    </h3>
                    <div className="overflow-hidden">
                        <div className="w-full">
                            <InvestmentAnalyticsSection className="w-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Server Events Carousel - Below Analytics */}
            <div className="px-4 mb-6">
                <ServerEventsCarousel
                    events={dashboardData?.server_events?.events || []}
                    onEventUpdate={() => {
                        // Handle event updates if needed
                        console.log('Server events updated');
                    }}
                />
            </div>

            {/* Quick Actions - Enhanced */}
            <div className="px-4 mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-3">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            className={`text-center transition-all transform hover:scale-105 active:scale-95 ${action.disabled ? 'opacity-60' : ''
                                }`}
                            onClick={action.onClick}
                            disabled={action.disabled}
                        >
                            <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center mb-2 mx-auto shadow-lg ${action.disabled ? 'grayscale' : ''
                                }`}>
                                <action.icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-xs font-medium text-gray-700">{action.label}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Transactions - Enhanced */}
            <div className="px-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        Transactions
                    </h3>
                    <button
                        onClick={() => setTransactionsExpanded(!transactionsExpanded)}
                        className="text-green-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                    >
                        {transactionsExpanded ? 'See Less' : 'See All'} <ArrowRight className={`w-4 h-4 transition-transform ${transactionsExpanded ? 'rotate-90' : ''}`} />
                    </button>
                </div>
                <div className="space-y-3">
                    <TransactionHistory
                        transactions={transactionsExpanded ? transactions : transactions.slice(0, 5)}
                        onReportIssue={handleReportIssue}
                        showTitle={false}
                        showSeeAll={false}
                    />
                </div>
            </div>

            {/* Bottom Navigation - Enhanced */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 shadow-lg backdrop-blur-lg bg-opacity-95">
                <div className="flex justify-around items-center">
                    <button
                        onClick={() => setActiveSection('home')}
                        className={`transition-all ${activeSection === 'home' ? 'text-green-600 scale-110' : 'text-gray-400'}`}
                    >
                        <Home className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => setActiveSection('wallet')}
                        className={`transition-all ${activeSection === 'wallet' ? 'text-green-600 scale-110' : 'text-gray-400'}`}
                    >
                        <Wallet className="w-6 h-6" />
                    </button>
                    <div className="relative -top-8">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 hover:shadow-green-500/50"
                        >
                            <Plus className="w-8 h-8 text-white" />
                        </button>
                    </div>
                    <button
                        onClick={scrollToAnalytics}
                        className={`transition-all ${activeSection === 'analytics' ? 'text-green-600 scale-110' : 'text-gray-400'}`}
                    >
                        <TrendingUp className="w-6 h-6" />
                    </button>
                    <button
                        className="transition-all text-gray-400 hover:text-green-600"
                        onClick={handleOpenProfileDropdown} // Added click handler for profile in mobile bottom nav
                    >
                        <User className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Add Modal - Enhanced with Scroll */}
            {showAddModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-5 flex items-end justify-center z-50 backdrop-blur-sm animate-fade-in"
                    onClick={(e) => {
                        // Close when clicking on the dimmed backdrop only
                        if (e.target === e.currentTarget) setShowAddModal(false);
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quick-actions-title"
                >
                    <div className="w-full bg-white rounded-t-3xl p-6 transform transition-all duration-300 ease-out translate-y-0 max-h-[80vh] overflow-y-auto">
                        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>

                        <div className="flex items-center justify-between mb-4">
                            <div className="text-left">
                                <h3 id="quick-actions-title" className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-green-600" />
                                    Quick Actions
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Choose an action to continue</p>
                            </div>
                            <button
                                aria-label="Close quick actions"
                                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
                                onClick={() => setShowAddModal(false)}
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-3 pb-4">
                            {addMenuItems.map((item, index) => (
                                <button
                                    key={index}
                                    className="w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl hover:shadow-md transition-all transform hover:scale-[1.02] active:scale-95 border border-gray-100"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        if (item.onClick) {
                                            item.onClick();
                                        }
                                    }}
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-semibold text-gray-800">{item.label}</p>
                                        <p className="text-xs text-gray-500">{item.desc}</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Notification - Enhanced */}
            {showPaymentNotification && (
                <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
                    <div className={`p-4 rounded-2xl shadow-2xl border-l-4 ${paymentStatus === 'success'
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500 text-green-800'
                        : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500 text-red-800'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentStatus === 'success' ? 'bg-green-100' : 'bg-red-100'
                                    }`}>
                                    {paymentStatus === 'success' ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    ) : (
                                        <X className="w-6 h-6 text-red-600" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold">
                                        {paymentStatus === 'success' ? 'Payment Successful!' : 'Payment Failed'}
                                    </p>
                                    <p className="text-sm opacity-75">
                                        {paymentStatus === 'success'
                                            ? 'Your payment has been processed successfully.'
                                            : 'There was an issue processing your payment.'
                                        }
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPaymentNotification(false)}
                                className="p-2 hover:bg-black hover:bg-opacity-10 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Network Error Notification */}
            {networkError && (
                <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
                    <div className="p-4 rounded-2xl shadow-2xl border-l-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-500 text-yellow-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100">
                                    <X className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="font-bold">Network Connection Lost</p>
                                    <p className="text-sm opacity-75">
                                        Showing cached data. Reconnecting...
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setNetworkError(false)}
                                className="p-2 hover:bg-black hover:bg-opacity-10 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <WithdrawalModal
                isOpen={showWithdrawalModal}
                onClose={() => setShowWithdrawalModal(false)}
                dashboardData={dashboardData}
                onWithdraw={handleWithdrawal}
            />

            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                dashboardData={dashboardData}
                onSuccess={handleTopUp}
            />

            <RenewModal
                isOpen={showRenewModal}
                onClose={() => setShowRenewModal(false)}
                dashboardData={dashboardData}
                onRenew={handleRenew}
            />

            {showDueDateCalendar && (
                <ErrorBoundary>
                    <DueDateCalendar
                        onClose={() => setShowDueDateCalendar(false)}
                        investorId={dashboardData?.user?.id}
                        dueDatesData={dashboardData?.due_dates}
                        fallbackSpendingBalance={getSpendingBalance()}
                        loading={loading}
                    />
                </ErrorBoundary>
            )}

            <ProfileDropdown
                isOpen={showProfileDropdown}
                dashboardData={dashboardData}
                onClose={handleCloseProfileDropdown}
                isMobile={isMobile}
            />

            {showUnderDevelopmentOverlay && (
                <UnderDevelopmentOverlay
                    onClose={() => setShowUnderDevelopmentOverlay(false)}
                />
            )}

            <SessionExpiredModal
                isOpen={showSessionExpiredModal}
                onClose={() => setShowSessionExpiredModal(false)}
            />
        </div>
    );

    // Desktop View
    return (
        <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-100 fixed h-full z-10 hidden md:block shadow-lg">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-xl">I</span>
                        </div>
                        <span className="text-xl font-bold text-gray-800">Incap</span>
                    </div>

                    <nav className="space-y-1">
                        {sidebarItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={item.onClick}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${item.active
                                    ? 'bg-green-50 text-green-600 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {typeof item.icon === 'function' ? <item.icon /> : <item.icon className="w-5 h-5" />}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                                {getGreeting()}, {getUserName()}
                                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                            </h1>
                            <p className="text-gray-600">Here's what's happening with your portfolio today.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleManualRefresh}
                                className={`p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-2 border border-gray-200 ${isRefreshing ? 'cursor-wait opacity-80' : ''}`}
                                title="Refresh Dashboard"
                                disabled={isRefreshing}
                            >
                                <RotateCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin-slow' : ''}`} />
                                {!isMobile && <span className="text-sm font-medium">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>}
                            </button>
                            <NotificationDropdown
                                notifications={notifications}
                                unreadCount={unreadCount}
                                onMarkAsRead={markAsRead}
                                onMarkAllAsRead={markAllAsRead}
                                onDeleteNotification={deleteNotification}
                                onClearAllNotifications={clearAllNotifications}
                            />
                            <div
                                className="flex items-center gap-3 bg-white p-3 pr-4 rounded-2xl border border-gray-200 cursor-pointer hover:shadow-lg transition-all transform hover:scale-105"
                                onClick={handleOpenProfileDropdown}
                            >
                                <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full overflow-hidden flex items-center justify-center">
                                    {getProfilePic() ? (
                                        <img src={getProfilePic()} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <User className="w-6 h-6 text-green-600" />
                                    )}
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold text-gray-800">{getUserName()}</p>
                                    <p className="text-xs text-gray-500">View Profile</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column */}
                    <div className="col-span-8 space-y-6">
                        {/* Wallet Card */}
                        <div className="bg-gradient-to-br from-slate-700 via-emerald-700 to-green-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl transform transition-all hover:scale-[1.02]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 shadow-xl opacity-5 rounded-full -mr-16 -mt-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <p className="text-slate-400 mb-2">Total Balance</p>
                                        <h2 className="text-4xl font-bold mb-2">{loading ? 'Loading...' : (showSensitive ? formatCurrency(getInvestmentBalance()) : '******')}</h2>
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <span>Spending: {loading ? '...' : (showSensitive ? formatCurrency(getSpendingBalance()) : '******')}</span>
                                            {dashboardData?._cached && lastUpdate && (
                                                <span className="text-xs text-gray-300 italic">.</span>
                                            )}
                                            {lastUpdate && (
                                                <>
                                                    <span>•</span>
                                                    <span>Updated {timeAgo(lastUpdate)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowSensitive(!showSensitive)}
                                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                    >
                                        {showSensitive ? <Eye className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowTopUpModal(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-xl font-medium transition-all hover:shadow-lg"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Top Up
                                    </button>
                                    <button
                                        onClick={() => setShowWithdrawalModal(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-xl font-medium transition-all hover:shadow-lg"
                                    >
                                        <ArrowUp className="w-5 h-5 rotate-45" />
                                        Withdraw
                                    </button>
                                    <button
                                        onClick={handleRenewClick}
                                        disabled={!isEligibleForRenewal}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${isEligibleForRenewal ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white hover:opacity-95' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                        Renew
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Analytics Section */}
                        <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.01]" id="analytics-section">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    Investment Analytics
                                </h3>
                                <select className="bg-gradient-to-r from-gray-50 to-white border border-gray-100 text-sm font-medium text-gray-600 rounded-xl px-4 py-2 transition-all hover:shadow-md">
                                    <option>This Month</option>
                                    <option>Last Month</option>
                                    <option>This Year</option>
                                </select>
                            </div>
                            <InvestmentAnalyticsSection />
                        </div>

                        {/* Server Events Carousel - Below Analytics */}
                        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                            <ServerEventsCarousel
                                events={dashboardData?.server_events?.events || []}
                                onEventUpdate={() => {
                                    // Handle event updates if needed
                                    console.log('Server events updated');
                                }}
                            />
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.01]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-green-600" />
                                    Recent Transactions
                                </h3>
                                <button
                                    onClick={() => setTransactionsExpanded(!transactionsExpanded)}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl font-medium transition-all hover:shadow-lg hover:scale-105 transform"
                                >
                                    {transactionsExpanded ? 'View Less' : 'View All'}
                                </button>
                            </div>
                            <TransactionHistory
                                transactions={transactionsExpanded ? transactions : transactions.slice(0, 5)}
                                onReportIssue={handleReportIssue}
                                showTitle={false}
                                showSeeAll={false}
                            />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="col-span-4 space-y-6">
                        {/* Portfolio Summary */}
                        <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.01]">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-green-600" />
                                Portfolio Summary
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-600 text-sm">Portfolio Type</span>
                                        <span className="font-semibold text-gray-800">{getPortfolioType()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">Investment Plan</span>
                                        <span className="font-semibold text-gray-800">{getInvestmentType()}</span>
                                    </div>
                                </div>
                                {!hasInvestmentType() && (
                                    <button
                                        onClick={handleDiscover}
                                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium transition-all hover:shadow-lg hover:scale-105 transform"
                                    >
                                        Select Investment Plan
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Goals Summary */}
                        <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.01]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-green-600" />
                                    Your Goals
                                </h3>
                                <button
                                    onClick={handleGoals}
                                    className="text-green-600 text-sm font-medium hover:text-green-700 transition-all hover:scale-105 flex items-center gap-1"
                                >
                                    View All <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                            <GoalsSummary dashboardData={dashboardData} />
                        </div>

                        {/* Due Dates */}
                        <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 transition-all hover:shadow-xl hover:scale-[1.01]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-green-600" />
                                    Upcoming Due Dates
                                </h3>
                                <button
                                    onClick={handleDueDates}
                                    className="text-green-600 text-sm font-medium hover:text-green-700 transition-all hover:scale-105 flex items-center gap-1"
                                >
                                    View Calendar <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                            {/* Add a mini calendar or list of upcoming dates here */}
                            <div className="text-center py-8 text-gray-500 text-sm">
                                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Check the calendar for details</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showWithdrawalModal && (
                <WithdrawalModal
                    isOpen={showWithdrawalModal}
                    onClose={() => setShowWithdrawalModal(false)}
                    dashboardData={dashboardData}
                    onWithdraw={handleWithdrawal}
                    balance={getInvestmentBalance()}
                    isLoading={isWithdrawalProcessing}
                />
            )}

            {showTopUpModal && (
                <TopUpModal
                    isOpen={showTopUpModal}
                    onClose={() => setShowTopUpModal(false)}
                    dashboardData={dashboardData}
                    onSuccess={handleTopUp}
                />
            )}

            {showRenewModal && (
                <RenewModal
                    isOpen={showRenewModal}
                    onClose={() => setShowRenewModal(false)}
                    onRenew={handleRenew}
                    currentInvestment={dashboardData?.investment}
                />
            )}

            <ProfileDropdown
                isOpen={showProfileDropdown}
                onClose={handleCloseProfileDropdown}
                dashboardData={dashboardData}
                isMobile={isMobile}
            />

            {showDueDateCalendar && (
                <DueDateCalendar
                    isOpen={showDueDateCalendar}
                    onClose={handleCloseDueDateCalendar}
                    dueDatesData={dashboardData?.due_dates}
                    investorId={dashboardData?.user?.id}
                    fallbackSpendingBalance={getSpendingBalance()}
                />
            )}

            {showUnderDevelopmentOverlay && (
                <UnderDevelopmentOverlay
                    isOpen={showUnderDevelopmentOverlay}
                    onClose={() => setShowUnderDevelopmentOverlay(false)}
                />
            )}

            {showCustomerCare && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Customer Care</h2>
                            <button
                                onClick={() => setShowCustomerCare(false)}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4">
                            <CustomerCare />
                        </div>
                    </div>
                </div>
            )}

            <SessionExpiredModal
                isOpen={showSessionExpiredModal}
                onClose={() => setShowSessionExpiredModal(false)}
            />
        </div>
    );
};

export default Dashboard;
