import React, { useState, useEffect } from 'react';
import './Admin.css';
import Pagination from './Pagination';

const AdminTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingId, setProcessingId] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [pagination, setPagination] = useState({
        total_count: 0,
        total_pages: 1
    });

    const fetchTransactions = async (page = 1, limit = 20) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

            const params = new URLSearchParams();
            params.append('page', page);
            params.append('limit', limit);

            const response = await fetch(`${API_BASE_URL}/admin/pending-withdrawals?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setTransactions(data.pending_withdrawals);
                if (data.pagination) {
                    setPagination(data.pagination);
                }
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
        fetchTransactions(currentPage, pageSize);
    }, [currentPage, pageSize]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    const handleApprove = async (id) => {
        if (!window.confirm('Are you sure you want to approve this withdrawal?')) return;

        setProcessingId(id);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/approve-withdrawal/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                fetchTransactions(currentPage, pageSize); // Maintain page
            } else {
                alert(data.detail || 'Approval failed');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Enter rejection reason:');
        if (reason === null) return;

        setProcessingId(id);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/reject-withdrawal/${id}?rejection_reason=${encodeURIComponent(reason)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                fetchTransactions(currentPage, pageSize); // Maintain page
            } else {
                alert(data.detail || 'Rejection failed');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setProcessingId(null);
        }
    };

    const handlePay = async (id, amount, name, isManual = false) => {
        setProcessingId(id);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

            const verifyResp = await fetch(`${API_BASE_URL}/admin/verify-withdrawal-account/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const verifyData = await verifyResp.json();

            if (!verifyData.success) {
                alert(`Verification Failed: ${verifyData.detail || verifyData.error || 'Could not verify account details'}`);
                setProcessingId(null);
                return;
            }

            const resolvedName = verifyData.data.account_name;

            const modeText = isManual ? 'MANUAL transfer' : 'Paystack payout';
            const confirmMsg = `
            Verification Successful!
            
            Resolved Name: ${resolvedName}
            Investor Name: ${name}
            Amount: ₦${amount.toLocaleString()}
            
            You have selected ${modeText.toUpperCase()}. 
            ${isManual ? 'Have you made this transfer manually?' : 'Do you want to initiate this transfer via Paystack?'}
            `;

            if (!window.confirm(confirmMsg)) {
                setProcessingId(null);
                return;
            }

            const endpoint = isManual ? 'manual-pay-withdrawal' : 'pay-withdrawal';
            const response = await fetch(`${API_BASE_URL}/admin/${endpoint}/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                alert(isManual ? 'Transaction marked as sent!' : 'Payout initiated successfully!');
                fetchTransactions(currentPage, pageSize); // Maintain page
            } else {
                alert(data.detail || 'Action failed');
            }
        } catch (err) {
            console.error('Payout Error:', err);
            alert('Error processing payout. See console for details.');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="admin-card">
            <div className="admin-header">
                <h3>Withdrawal Management</h3>
                <button className="admin-btn-secondary" onClick={() => fetchTransactions(currentPage, pageSize)}>Refresh</button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-container">Loading...</div>
            ) : (
                <>
                    <div className="admin-table-container">
                        {transactions.length === 0 ? (
                            <p style={{ textAlign: 'center', padding: '2rem' }}>No pending or processing withdrawals.</p>
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
                                                            disabled={processingId === t.transaction_id}
                                                        >
                                                            {processingId === t.transaction_id ? 'Wait...' : 'Approve'}
                                                        </button>
                                                        <button
                                                            className="admin-btn-primary"
                                                            style={{ backgroundColor: '#e74c3c' }}
                                                            onClick={() => handleReject(t.transaction_id)}
                                                            disabled={processingId === t.transaction_id}
                                                        >
                                                            {processingId === t.transaction_id ? 'Wait...' : 'Reject'}
                                                        </button>
                                                    </>
                                                )}
                                                {t.status === 'processing' && (
                                                    <>
                                                        <button
                                                            className="admin-btn-primary"
                                                            style={{ backgroundColor: '#3498db', marginRight: '5px' }}
                                                            onClick={() => handlePay(t.transaction_id, t.amount, t.investor_name)}
                                                            disabled={processingId === t.transaction_id}
                                                        >
                                                            {processingId === t.transaction_id ? 'Verifying...' : 'Pay Now'}
                                                        </button>
                                                        <button
                                                            className="admin-btn-primary"
                                                            style={{ backgroundColor: '#f39c12' }}
                                                            onClick={() => handlePay(t.transaction_id, t.amount, t.investor_name, true)}
                                                            disabled={processingId === t.transaction_id}
                                                        >
                                                            {processingId === t.transaction_id ? 'Wait...' : 'Manual Pay'}
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={pagination.total_pages}
                        totalCount={pagination.total_count}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                    />
                </>
            )}
        </div>
    );
};

export default AdminTransactions;
