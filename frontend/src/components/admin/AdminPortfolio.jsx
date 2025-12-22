import React, { useState, useEffect } from 'react';
import './Admin.css';

const AdminPortfolio = () => {
    const [portfolios, setPortfolios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const fetchPortfolios = async (searchQuery = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const url = searchQuery
                ? `${API_BASE_URL}/admin/portfolio?search=${searchQuery}`
                : `${API_BASE_URL}/admin/portfolio`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setPortfolios(data.data);
            } else {
                setError(data.detail || 'Failed to fetch portfolios');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolios();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchPortfolios(search);
    };

    const handleEdit = (portfolio) => {
        setEditingId(portfolio.id);
        setEditForm({ ...portfolio });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/portfolio/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });
            const data = await response.json();

            if (data.success) {
                setEditingId(null);
                fetchPortfolios(search); // Refresh list
            } else {
                alert(data.detail || 'Update failed');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    return (
        <div className="admin-card">
            <div className="admin-header">
                <h3>Investor Portfolios</h3>
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
                                <th>Phone</th>
                                <th>Portfolio Type</th>
                                <th>Investment Type</th>
                                <th>Bank Details</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {portfolios.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.first_name} {p.surname}</td>
                                    <td>{p.email}</td>
                                    <td>{p.phone_number}</td>
                                    <td>{p.portfolio_type}</td>
                                    <td>{p.investment_type}</td>
                                    <td>
                                        <small>
                                            {p.bank_name}<br />
                                            {p.bank_account_number}<br />
                                            {p.bank_account_name}
                                        </small>
                                    </td>
                                    <td>
                                        <button className="admin-btn-primary" onClick={() => handleEdit(p)}>
                                            Update
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editingId && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <h3>Update Portfolio</h3>
                        <form onSubmit={handleUpdate}>
                            <div className="admin-form-group">
                                <label>First Name</label>
                                <input
                                    value={editForm.first_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                />
                            </div>
                            <div className="admin-form-group">
                                <label>Surname</label>
                                <input
                                    value={editForm.surname || ''}
                                    onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                                />
                            </div>
                            <div className="admin-form-group">
                                <label>Phone Number</label>
                                <input
                                    value={editForm.phone_number || ''}
                                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                                />
                            </div>
                            <div className="admin-form-group">
                                <label>Portfolio Type</label>
                                <select
                                    value={editForm.portfolio_type || ''}
                                    onChange={(e) => setEditForm({ ...editForm, portfolio_type: e.target.value })}
                                >
                                    <option value="Conservative">Conservative</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="Aggressive">Aggressive</option>
                                    <option value="High Yield">High Yield</option>
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label>Investment Type</label>
                                <input
                                    value={editForm.investment_type || ''}
                                    onChange={(e) => setEditForm({ ...editForm, investment_type: e.target.value })}
                                />
                            </div>
                            <div className="admin-form-group">
                                <label>Bank Name</label>
                                <input
                                    value={editForm.bank_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                                />
                            </div>
                            <div className="admin-form-group">
                                <label>Account Number</label>
                                <input
                                    value={editForm.bank_account_number || ''}
                                    onChange={(e) => setEditForm({ ...editForm, bank_account_number: e.target.value })}
                                />
                            </div>
                            <div className="admin-form-group">
                                <label>Account Name</label>
                                <input
                                    value={editForm.bank_account_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, bank_account_name: e.target.value })}
                                />
                            </div>

                            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                <button type="button" className="admin-btn-secondary" onClick={() => setEditingId(null)} style={{ marginRight: '10px' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="admin-btn-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPortfolio;
