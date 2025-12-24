import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Pagination from './Pagination';

const AdminInvestors = () => {
    const [investors, setInvestors] = useState([]);
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

    const fetchInvestors = async (searchQuery = '', page = 1, limit = 20) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            params.append('page', page);
            params.append('limit', limit);

            const url = `${API_BASE_URL}/admin/investors?${params.toString()}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setInvestors(data.data);
                if (data.pagination) {
                    setPagination(data.pagination);
                }
            } else {
                setError(data.detail || 'Failed to fetch investors');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvestors(search, currentPage, pageSize);
    }, [currentPage, pageSize]);

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to page 1 on search
        fetchInvestors(search, 1, pageSize);
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setCurrentPage(1); // Reset to page 1 on page size change
    };

    return (
        <div className="admin-card">
            <div className="admin-header">
                <h3>All Investors</h3>
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
                                    <th>Investment Type</th>
                                    <th>Start Date</th>
                                    <th>Last Due Date</th>
                                    <th>Next Due Date</th>
                                    <th>Expiry Date</th>
                                    <th>Current Week</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investors.length > 0 ? (
                                    investors.map((inv) => (
                                        <tr key={inv.id}>
                                            <td>{inv.first_name} {inv.surname}</td>
                                            <td>{inv.email}</td>
                                            <td>{inv.investment_type || 'N/A'}</td>
                                            <td>{new Date(inv.investment_start_date || inv.created_at).toLocaleDateString()}</td>
                                            <td>{inv.last_due_date ? new Date(inv.last_due_date).toLocaleDateString() : '-'}</td>
                                            <td>{inv.next_due_date ? new Date(inv.next_due_date).toLocaleDateString() : 'Completed'}</td>
                                            <td>{inv.investment_expiry_date ? new Date(inv.investment_expiry_date).toLocaleDateString() : '-'}</td>
                                            <td>{inv.current_week}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No investors found</td>
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

export default AdminInvestors;
