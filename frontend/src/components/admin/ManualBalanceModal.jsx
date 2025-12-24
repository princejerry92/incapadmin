import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, UserIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const ManualBalanceModal = ({ isOpen, onClose, onUpdate }) => {
    const [search, setSearch] = useState('');
    const [investors, setInvestors] = useState([]);
    const [selectedInvestor, setSelectedInvestor] = useState(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setInvestors([]);
            setSelectedInvestor(null);
            setAmount('');
            setReason('');
            setSuccess(false);
            setError('');
        }
    }, [isOpen]);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!search) return;

        setSearching(true);
        setError('');
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_BASE_URL}/admin/investors?search=${search}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setInvestors(data.data || []);
                if (data.data.length === 0) setError('No investors found');
            } else {
                setError(data.detail || 'Search failed');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setSearching(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedInvestor || !amount || !reason) {
            setError('All fields are required');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_BASE_URL}/admin/investor/${selectedInvestor.id}/adjust-balance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    reason: reason
                })
            });
            const data = await response.json();
            if (data.success) {
                setSuccess(true);
                if (onUpdate) onUpdate();
                setTimeout(() => onClose(), 2000);
            } else {
                setError(data.detail || 'Update failed');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all text-gray-800">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800">Manual Balance Update</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {success ? (
                        <div className="text-center py-12">
                            <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto mb-4" />
                            <h4 className="text-2xl font-bold text-gray-800">Success!</h4>
                            <p className="text-gray-600 mt-2">Spending account has been updated.</p>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Search Investor */}
                            {!selectedInvestor && (
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-800">Find Investor</label>
                                    <form onSubmit={handleSearch} className="relative">
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Enter email or name..."
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
                                        />
                                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                                        <button
                                            type="submit"
                                            disabled={searching}
                                            className="absolute right-2 top-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                                        >
                                            {searching ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : 'Search'}
                                        </button>
                                    </form>

                                    {investors.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 rounded-lg p-2 bg-gray-50">
                                            {investors.map((inv) => (
                                                <button
                                                    key={inv.id}
                                                    onClick={() => setSelectedInvestor(inv)}
                                                    className="w-full text-left p-3 hover:bg-white hover:shadow-sm rounded-lg transition-all flex items-center group border border-transparent hover:border-indigo-100"
                                                >
                                                    <div className="bg-indigo-100 p-2 rounded-full mr-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <UserIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{inv.first_name} {inv.surname}</p>
                                                        <p className="text-xs text-gray-600">{inv.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Adjust Balance */}
                            {selectedInvestor && (
                                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                                    <div className="bg-indigo-50 p-4 rounded-xl flex items-center justify-between border border-indigo-100">
                                        <div className="flex items-center">
                                            <div className="bg-indigo-100 p-2 rounded-full mr-3">
                                                <UserIcon className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-indigo-900">{selectedInvestor.first_name} {selectedInvestor.surname}</p>
                                                <p className="text-xs text-indigo-700">{selectedInvestor.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedInvestor(null)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                                        >
                                            Change
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-800 mb-1">Adjustment Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-3 text-gray-500 font-bold">₦</span>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    placeholder="5000 or -5000"
                                                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 font-bold text-lg"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">Positive to add, negative to deduct</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-800 mb-1">Reason / Description</label>
                                            <textarea
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder="Explain why you are adjusting the balance..."
                                                rows="3"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleUpdate}
                                        disabled={loading || !amount || !reason}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-gray-400 disabled:shadow-none transition-all flex items-center justify-center transform active:scale-[0.98]"
                                    >
                                        {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" /> : null}
                                        {loading ? 'Processing...' : 'Confirm Update'}
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center">
                                    <XMarkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManualBalanceModal;
