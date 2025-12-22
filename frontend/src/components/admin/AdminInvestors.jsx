import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const AdminInvestors = () => {
    const [investors, setInvestors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    const fetchInvestors = async (searchQuery = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const url = searchQuery
                ? `${API_BASE_URL}/admin/investors?search=${searchQuery}`
                : `${API_BASE_URL}/admin/investors`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setInvestors(data.data);
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
        fetchInvestors();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchInvestors(search);
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
                <div>Loading...</div>
            ) : (
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
                            {investors.map((inv) => (
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
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminInvestors;
