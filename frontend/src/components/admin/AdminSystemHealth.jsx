import React, { useState, useEffect } from 'react';
import {
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    WrenchScrewdriverIcon,
    PlayCircleIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

// Simple API helpers (mocked if not available in global scope, assuming fetch is used)
const apiCall = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('adminToken');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    // Adjust base URL as needed or assume relative path proxy
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    return res.json();
};

const AdminSystemHealth = () => {
    const [loading, setLoading] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [integrityIssues, setIntegrityIssues] = useState([]);
    const [lastScanTime, setLastScanTime] = useState(null);
    const [cronStatus, setCronStatus] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [fixingId, setFixingId] = useState(null);

    // Initial Scan on Mount
    useEffect(() => {
        handleScan();
    }, []);

    // Auto-refresh interval (every 1 hour as requested "lifecycle")
    useEffect(() => {
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => {
                // Trigger auto-check silently
                handleScan(true);
            }, 3600000); // 1 hour
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const handleRunCron = async () => {
        setLoading(true);
        try {
            const res = await apiCall('/admin/cron/run-interest-payments', 'POST');
            if (res.success) {
                setCronStatus({
                    success: true,
                    message: `Successfully processed ${res.processed_count} interest payments.`,
                    errors: res.errors
                });
            } else {
                setCronStatus({ success: false, message: res.error });
            }
        } catch (err) {
            setCronStatus({ success: false, message: 'Failed to run cron job' });
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (silent = false) => {
        if (!silent) setScanLoading(true);
        try {
            const res = await apiCall('/admin/integrity/check');
            if (res.success) {
                setIntegrityIssues(res.issues || []);
                setLastScanTime(new Date());
            }
        } catch (err) {
            console.error("Scan failed", err);
        } finally {
            if (!silent) setScanLoading(false);
        }
    };

    const handleFix = async (investorId) => {
        if (fixingId) return;
        setFixingId(investorId);
        try {
            const res = await apiCall(`/admin/integrity/fix/${investorId}`, 'POST');
            if (res.success) {
                // Refresh list
                handleScan(true);
                alert('Fix applied successfully');
            } else {
                alert(`Fix failed: ${res.error}`);
            }
        } catch (err) {
            alert('Fix failed: Network error');
        } finally {
            setFixingId(null);
        }
    };

    const totalOverpaid = integrityIssues
        .filter(i => i.issue === 'payment_overage')
        .reduce((sum, i) => {
            const match = i.details.match(/Paid: ([\d.]+), Expected: ([\d.]+)/);
            if (match) {
                return sum + (parseFloat(match[1]) - parseFloat(match[2]));
            }
            return sum;
        }, 0);

    const StatusCard = ({ title, value, icon: Icon, color }) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header / Config */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">System Health & Automation</h2>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Auto-Scan (1h):</span>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${autoRefresh ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${autoRefresh ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>

            {/* Cron / Interest Payment Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-2xl border border-blue-100">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-blue-900 flex items-center">
                            <ClockIcon className="h-5 w-5 mr-2" />
                            Interest Payment Scheduler
                        </h3>
                        <p className="text-blue-600 mt-2 max-w-xl">
                            The system automatically calculates and pays interest every hour.
                            You can manually trigger this process if needed.
                            <span className="font-semibold block mt-1">Note: Idempotency checks prevent duplicate payments for the same day.</span>
                        </p>
                    </div>
                    <button
                        onClick={handleRunCron}
                        disabled={loading}
                        className={`flex items-center px-6 py-3 rounded-lg text-white font-bold shadow-lg transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
                            }`}
                    >
                        {loading ? <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" /> : <PlayCircleIcon className="h-5 w-5 mr-2" />}
                        Run Interest Calculation
                    </button>
                </div>

                {cronStatus && (
                    <div className={`mt-6 p-4 rounded-lg border ${cronStatus.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <div className="flex items-center">
                            {cronStatus.success ? <CheckCircleIcon className="h-5 w-5 mr-2" /> : <ExclamationTriangleIcon className="h-5 w-5 mr-2" />}
                            <span className="font-bold">{cronStatus.message}</span>
                        </div>
                        {cronStatus.errors && cronStatus.errors.length > 0 && (
                            <ul className="mt-2 list-disc list-inside text-sm">
                                {cronStatus.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Data Integrity Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center">
                            <WrenchScrewdriverIcon className="h-6 w-6 mr-2 text-gray-600" />
                            Data Integrity Monitor
                        </h3>
                        <p className="text-gray-500 mt-1">
                            Scan for inconsistencies in investor records (missing dates, week mismatches).
                            Last scan: {lastScanTime ? format(lastScanTime, 'HH:mm:ss') : 'Never'}
                        </p>
                    </div>
                    <button
                        onClick={() => handleScan(false)}
                        disabled={scanLoading}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all"
                    >
                        <ArrowPathIcon className={`h-4 w-4 mr-2 ${scanLoading ? 'animate-spin' : ''}`} />
                        Scan Now
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatusCard
                        title="Issues Detected"
                        value={integrityIssues.length}
                        icon={ExclamationTriangleIcon}
                        color={integrityIssues.length > 0 ? 'bg-red-500' : 'bg-green-500'}
                    />
                    <StatusCard
                        title="Potential Overage"
                        value={`₦${totalOverpaid.toLocaleString()}`}
                        icon={CheckCircleIcon}
                        color={totalOverpaid > 0 ? 'bg-orange-500' : 'bg-green-500'}
                    />
                    <StatusCard
                        title="System Status"
                        value={integrityIssues.length > 0 ? 'Attention' : 'Healthy'}
                        icon={CheckCircleIcon}
                        color={integrityIssues.length > 0 ? 'bg-indigo-500' : 'bg-green-500'}
                    />
                </div>

                {/* Issues Table */}
                {integrityIssues.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Investor</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Issue Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {integrityIssues.map((issue, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{issue.email}</div>
                                            <div className="text-xs text-gray-500">{issue.investor_id}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 capitalize">
                                                {issue.issue.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">{issue.details}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleFix(issue.investor_id)}
                                                disabled={fixingId === issue.investor_id}
                                                className={`px-3 py-1 rounded-md transition-colors flex items-center ml-auto ${fixingId === issue.investor_id
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100'
                                                    }`}
                                            >
                                                {fixingId === issue.investor_id ? (
                                                    <>
                                                        <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                                                        Fixing...
                                                    </>
                                                ) : (
                                                    'Fix Issue'
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {integrityIssues.length === 0 && !scanLoading && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">All Systems Operational</h3>
                        <p className="mt-1 text-sm text-gray-500">No data integrity issues found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSystemHealth;
