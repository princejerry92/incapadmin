import { createClient } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

const AdminRealtimeContext = createContext();

export const useAdminRealtime = () => useContext(AdminRealtimeContext);

export const AdminRealtimeProvider = ({ children }) => {
    const [supabase, setSupabase] = useState(null);
    const [newQueryCount, setNewQueryCount] = useState(0);

    useEffect(() => {
        const initSupabase = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                if (!token) return;

                const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
                const response = await fetch(`${API_BASE_URL}/admin/config`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                if (data.success) {
                    const client = createClient(data.supabase_url, data.supabase_key);
                    setSupabase(client);
                }
            } catch (error) {
                console.error('Failed to init Supabase:', error);
            }
        };

        initSupabase();
    }, []);

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel('admin-dashboard')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'customer_queries' },
                (payload) => {
                    console.log('New query received:', payload);
                    setNewQueryCount((prev) => prev + 1);
                    // Play a notification sound if desired
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const resetNewQueryCount = () => setNewQueryCount(0);

    return (
        <AdminRealtimeContext.Provider value={{ supabase, newQueryCount, resetNewQueryCount }}>
            {children}
        </AdminRealtimeContext.Provider>
    );
};
