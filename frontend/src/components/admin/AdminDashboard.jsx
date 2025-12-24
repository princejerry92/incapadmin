import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminInvestors from './AdminInvestors';
import AdminPayments from './AdminPayments';
import AdminPortfolio from './AdminPortfolio';
import AdminTransactions from './AdminTransactions';
import AdminCustomerCare from './AdminCustomerCare';
import AdminMissedPayments from './AdminMissedPayments';
import AdminSystemHealth from './AdminSystemHealth';
import ServerEventsManager from './ServerEventsManager';
import ManualBalanceModal from './ManualBalanceModal';
import { AdminRealtimeProvider, useAdminRealtime } from './AdminRealtime';
import './Admin.css';
import {
    UsersIcon,
    CreditCardIcon,
    ChartBarIcon,
    ArrowsUpDownIcon,
    ExclamationTriangleIcon,
    ArrowRightOnRectangleIcon,
    CpuChipIcon,
    ClockIcon,
    SpeakerWaveIcon,
    BanknotesIcon
} from '@heroicons/react/24/outline';

const AdminDashboardContent = () => {
    const [activeTab, setActiveTab] = useState('investors');
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const navigate = useNavigate();
    const { newQueryCount } = useAdminRealtime();

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    };

    const triggerRefresh = () => setRefreshKey(prev => prev + 1);

    const renderContent = () => {
        switch (activeTab) {
            case 'investors':
                return <AdminInvestors key={refreshKey} />;
            case 'payments':
                return <AdminPayments key={refreshKey} />;
            case 'portfolio':
                return <AdminPortfolio key={refreshKey} />;
            case 'transactions':
                return <AdminTransactions key={refreshKey} />;
            case 'customer-care':
                return <AdminCustomerCare key={refreshKey} />;
            case 'server-events':
                return <ServerEventsManager key={refreshKey} />;
            case 'missed-payments':
                return <AdminMissedPayments key={refreshKey} />;
            case 'system-health':
                return <AdminSystemHealth key={refreshKey} />;
            default:
                return <AdminInvestors key={refreshKey} />;
        }
    };

    const navItems = [
        { id: 'investors', label: 'Investors', icon: UsersIcon },
        { id: 'payments', label: 'Payments', icon: CreditCardIcon },
        { id: 'portfolio', label: 'Portfolio', icon: ChartBarIcon },
        { id: 'transactions', label: 'Transactions', icon: ArrowsUpDownIcon },
        { id: 'customer-care', label: 'Customer Care', icon: ExclamationTriangleIcon },
        { id: 'server-events', label: 'Server Events', icon: SpeakerWaveIcon },
        { id: 'missed-payments', label: 'Missed Payments', icon: ClockIcon },
        { id: 'system-health', label: 'System Health', icon: CpuChipIcon },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex">
            {/* Neumorphic Sidebar */}
            <div className="w-64 bg-white/90 backdrop-blur-sm shadow-2xl border-r-2 border-gray-200/50 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-r-3xl shadow-inner opacity-50"></div>
                <div className="relative z-10 p-6">
                    <div className="flex items-center justify-center mb-8">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg">
                            <ChartBarIcon className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-8 text-center">Admin Panel</h2>
                    <nav className="space-y-2">
                        {navItems.map(({ id, label, icon: Icon }) => (
                            <div
                                key={id}
                                className={`group flex items-center px-4 py-3 rounded-lg cursor-pointer transition-all duration-300 ${activeTab === id
                                    ? 'bg-blue-50 border-2 border-blue-200 shadow-lg'
                                    : 'hover:bg-gray-50 hover:shadow-md border-2 border-transparent'
                                    }`}
                                onClick={() => setActiveTab(id)}
                            >
                                <Icon className={`h-5 w-5 mr-3 ${activeTab === id ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-500'} transition-colors duration-200`} />
                                <span className={`text-sm font-medium ${activeTab === id ? 'text-blue-800' : 'text-gray-700 group-hover:text-blue-700'} transition-colors duration-200`}>
                                    {label}
                                </span>
                                {id === 'customer-care' && newQueryCount > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                        {newQueryCount}
                                    </span>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-sm border-b-2 border-gray-200/50 px-8 py-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-3xl font-bold text-gray-800 capitalize">
                                {activeTab.replace('-', ' ')}
                            </h1>
                            {activeTab === 'customer-care' && newQueryCount > 0 && (
                                <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                                    {newQueryCount} new queries
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setIsBalanceModalOpen(true)}
                                className="flex items-center bg-white border-2 border-indigo-100 text-indigo-600 px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:bg-indigo-50 transition-all duration-300 font-bold"
                            >
                                <BanknotesIcon className="h-5 w-5 mr-2" />
                                Update Balance
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300"
                            >
                                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="admin-content flex-1 p-8 bg-gray-50/50">
                    {renderContent()}
                </div>
            </div>

            <ManualBalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                onUpdate={triggerRefresh}
            />
        </div>
    );
};

const AdminDashboard = () => (
    <AdminRealtimeProvider>
        <AdminDashboardContent />
    </AdminRealtimeProvider>
);

export default AdminDashboard;
