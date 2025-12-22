import React, { useState, useEffect } from 'react';
import './Admin.css';
import { useAdminRealtime } from './AdminRealtime';

const AdminCustomerCare = () => {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [answeringId, setAnsweringId] = useState(null);
    const [adminResponse, setAdminResponse] = useState('');

    const { supabase, resetNewQueryCount } = useAdminRealtime();

    useEffect(() => {
        resetNewQueryCount();
    }, [resetNewQueryCount]);

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel('admin-customer-care')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'customer_queries' },
                () => {
                    fetchQueries(search);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, search]);

    const fetchQueries = async (searchQuery = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const url = searchQuery
                ? `${API_BASE_URL}/admin/customer-care?search=${searchQuery}`
                : `${API_BASE_URL}/admin/customer-care`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setQueries(data.data);
            } else {
                setError(data.detail || 'Failed to fetch queries');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueries();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchQueries(search);
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/customer-care/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();

            if (data.success) {
                fetchQueries(search); // Refresh list
            } else {
                alert(data.detail || 'Update failed');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    const handleAnswer = (id) => {
        setAnsweringId(id);
        setAdminResponse('');
    };

    const submitAnswer = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            const response = await fetch(`${API_BASE_URL}/admin/customer-care/${answeringId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'answered',
                    admin_response: adminResponse
                })
            });
            const data = await response.json();

            if (data.success) {
                setAnsweringId(null);
                fetchQueries(search); // Refresh list
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
                <h3>Customer Care Queries</h3>
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
                                <th>Date</th>
                                <th>User</th>
                                <th>Category</th>
                                <th>Message</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {queries.map((q) => (
                                <tr key={q.id}>
                                    <td>{new Date(q.created_at).toLocaleDateString()}</td>
                                    <td>
                                        {q.user_name}<br />
                                        <small>{q.user_email}</small><br />
                                        <small>Points: {q.user_points}</small>
                                    </td>
                                    <td>{q.category}</td>
                                    <td>
                                        <div style={{ maxWidth: '300px', whiteSpace: 'pre-wrap' }}>
                                            {q.message}
                                            {q.attachment_url && (
                                                <div style={{ marginTop: '5px' }}>
                                                    <a href={q.attachment_url} target="_blank" rel="noopener noreferrer">View Attachment</a>
                                                </div>
                                            )}
                                        </div>
                                        {q.admin_response && (
                                            <div style={{ marginTop: '10px', padding: '10px', background: '#f9f9f9', borderLeft: '3px solid #3498db' }}>
                                                <strong>Admin:</strong> {q.admin_response}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${q.status}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                    <td>
                                        {q.status !== 'closed' && (
                                            <>
                                                <button
                                                    className="admin-btn-primary"
                                                    style={{ fontSize: '0.8rem', padding: '5px 10px', marginBottom: '5px' }}
                                                    onClick={() => handleAnswer(q.id)}
                                                >
                                                    Answer
                                                </button>
                                                <br />
                                                <button
                                                    className="admin-btn-secondary"
                                                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                                                    onClick={() => handleStatusChange(q.id, 'closed')}
                                                >
                                                    Close
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {answeringId && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <h3>Answer Query</h3>
                        <form onSubmit={submitAnswer}>
                            <div className="admin-form-group">
                                <label>Response</label>
                                <textarea
                                    rows="5"
                                    value={adminResponse}
                                    onChange={(e) => setAdminResponse(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                                <button type="button" className="admin-btn-secondary" onClick={() => setAnsweringId(null)} style={{ marginRight: '10px' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="admin-btn-primary">
                                    Send Answer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCustomerCare;
