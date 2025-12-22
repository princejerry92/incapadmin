import React, { useState, useEffect } from 'react';
import './Admin.css';

const AdminTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/pending-withdrawals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setTransactions(data.pending_withdrawals);
            } else {
                setError(data.detail || 'Failed to fetch transactions');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleApprove = async (id) => {
        if (!window.confirm('Are you sure you want to approve this withdrawal?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/approve-withdrawal/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                fetchTransactions(); // Refresh list
            } else {
                alert(data.detail || 'Approval failed');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Enter rejection reason:');
        if (reason === null) return;

        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/reject-withdrawal/${id}?rejection_reason=${encodeURIComponent(reason)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                fetchTransactions(); // Refresh list
            } else {
                alert(data.detail || 'Rejection failed');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    const handlePay = async (id, amount, name) => {
        if (!window.confirm(`Are you sure you want to initiate a payout of ₦${amount.toLocaleString()} to ${name}?`)) return;

        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/pay-withdrawal/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                alert('Payout initiated successfully!');
                fetchTransactions(); // Refresh list
            } else {
                alert(data.detail || 'Payout failed');
            }
        } catch (err) {
            alert('Network error during payout');
        }
    };

    return (
        <div className="admin-card">
            <div className="admin-header">
                <h3>Withdrawal Management</h3>
                <button className="admin-btn-secondary" onClick={fetchTransactions}>Refresh</button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="admin-table-container">
                    {transactions.length === 0 ? (
                        <p>No pending or processing withdrawals.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Investor</th>
                                    <th>Amount</th>
                                    <th>Bank Details</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t) => (
                                    <tr key={t.transaction_id}>
                                        <td>{new Date(t.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {t.investor_name}<br />
                                            <small>{t.investor_email}</small>
                                        </td>
                                        <td>₦{t.amount.toLocaleString()}</td>
                                        <td>
                                            <small>
                                                {t.bank_name}<br />
                                                {t.bank_account_number}<br />
                                                {t.bank_account_name}
                                            </small>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${t.status}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td>
                                            {t.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="admin-btn-primary"
                                                        style={{ backgroundColor: '#2ecc71', marginRight: '5px' }}
                                                        onClick={() => handleApprove(t.transaction_id)}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="admin-btn-primary"
                                                        style={{ backgroundColor: '#e74c3c' }}
                                                        onClick={() => handleReject(t.transaction_id)}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {t.status === 'processing' && (
                                                <button
                                                    className="admin-btn-primary"
                                                    style={{ backgroundColor: '#3498db', marginRight: '5px' }}
                                                    onClick={() => handlePay(t.transaction_id, t.amount, t.investor_name)}
                                                >
                                                    Pay Now
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminTransactions;
