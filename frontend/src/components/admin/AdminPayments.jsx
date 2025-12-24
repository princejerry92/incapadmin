import React, { useState, useEffect } from 'react';
import './Admin.css';
import Pagination from './Pagination';

const AdminPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [pagination, setPagination] = useState({
        total_count: 0,
        total_pages: 1
    });

    const fetchPayments = async (searchQuery = '', page = 1, limit = 20) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            params.append('page', page);
            params.append('limit', limit);

            const url = `${API_BASE_URL}/admin/payments?${params.toString()}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setPayments(data.data);
                if (data.pagination) {
                    setPagination(data.pagination);
                }
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
        fetchPayments(search, currentPage, pageSize);
    }, [currentPage, pageSize]);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchPayments(search, 1, pageSize);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
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
                <div className="loading-container">Loading...</div>
            ) : (
                <>
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
                                {payments.length > 0 ? (
                                    payments.map((p) => (
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
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No payments found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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

export default AdminPayments;
