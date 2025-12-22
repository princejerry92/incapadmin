import React, { useState, useEffect } from 'react';
import {
    ExclamationCircleIcon,
    CheckCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

const AdminMissedPayments = () => {
    const [investors, setInvestors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [message, setMessage] = useState(null);

    const fetchMissedPayments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/missed-payments-summary`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch missed payments');
            }

            const data = await response.json();
            if (data.success) {
                setInvestors(data.data);
            } else {
                setError(data.error || 'Failed to fetch data');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMissedPayments();
    }, []);

    const handleCatchUp = async (investorId) => {
        setProcessingId(investorId);
        setMessage(null);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/catch-up-missed-payments/${investorId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message || 'Payments processed successfully' });
                // Refresh list
                fetchMissedPayments();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to process payments' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Missed Payments Resolution</h2>
                    <p className="text-sm text-gray-500 mt-1">Identify and resolve missed interest payments.</p>
                </div>
                <button
                    onClick={fetchMissedPayments}
                    className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 shadow-sm"
                    title="Refresh List"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>

            {message && (
                <div className={`mx-6 mt-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircleIcon className="h-5 w-5 mr-3" />
                    ) : (
                        <ExclamationCircleIcon className="h-5 w-5 mr-3" />
                    )}
                    {message.text}
                </div>
            )}

            {error && (
                <div className="mx-6 mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center border border-red-200">
                    <ExclamationCircleIcon className="h-5 w-5 mr-3" />
                    {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Investor</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Weeks Elapsed</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payments Made</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Missed</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {investors.length > 0 ? (
                            investors.map((investor) => (
                                <tr key={investor.investor_id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                                                    {investor.first_name?.[0]}{investor.surname?.[0]}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {investor.first_name} {investor.surname}
                                                </div>
                                                <div className="text-sm text-gray-500">{investor.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                            {investor.weeks_elapsed} weeks
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {investor.payment_counter}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 animate-pulse">
                                            {investor.missed_payments} Missed
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleCatchUp(investor.investor_id)}
                                            disabled={processingId === investor.investor_id}
                                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200 ${processingId === investor.investor_id ? 'opacity-75 cursor-not-allowed' : ''
                                                }`}
                                        >
                                            {processingId === investor.investor_id ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Processing...
                                                </>
                                            ) : (
                                                'Resolve Now'
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                                    <div className="flex flex-col items-center">
                                        <CheckCircleIcon className="h-12 w-12 text-green-400 mb-3" />
                                        <p className="text-lg font-medium text-gray-900">All caught up!</p>
                                        <p className="text-sm text-gray-500">No missed payments found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminMissedPayments;
