import React, { useState, useEffect } from 'react';
import './Admin.css';

const AdminPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    const fetchPayments = async (searchQuery = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const url = searchQuery
                ? `${API_BASE_URL}/admin/payments?search=${searchQuery}`
                : `${API_BASE_URL}/admin/payments`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setPayments(data.data);
            } else {
                setError(data.detail || 'Failed to fetch payments');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchPayments(search);
    };

    return (
        <div className="admin-card">
            <div className="admin-header">
                <h3>Investment Payments</h3>
                <form onSubmit={handleSearch}>
                    <input
                        type="text"
                        className="admin-search-bar"
                        placeholder="Search by email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Initial Investment</th>
                                <th>Total Investment</th>
                                <th>Total Paid (Interest)</th>
                                <th>Payment Status</th>
                                <th>Paystack Ref</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.name}</td>
                                    <td>{p.email}</td>
                                    <td>₦{p.initial_investment.toLocaleString()}</td>
                                    <td>₦{p.total_investment.toLocaleString()}</td>
                                    <td>₦{p.total_paid.toLocaleString()}</td>
                                    <td>
                                        <span className={`status-badge ${p.payment_status === 'success' ? 'status-success' : 'status-pending'}`}>
                                            {p.payment_status || 'Pending'}
                                        </span>
                                    </td>
                                    <td>{p.paystack_ref || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminPayments;
