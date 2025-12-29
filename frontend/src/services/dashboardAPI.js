// dashboardAPI.js
// API service for dashboard-related endpoints

import cacheService from './cache';
import dueDatesCacheService from './dueDatesCache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class DashboardAPI {
  constructor() {
    this.token = null;
    this.supabase = null;
    this.realTimeListeners = new Map();
  }

  setToken(token) {
    this.token = token;
  }

  // Initialize Supabase for real-time updates
  initSupabase(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async fetchWithAuth(url, options = {}) {
    // Check if we have a valid token
    if (!this.token) {
      // Priority 1: Check for adminToken if this is an admin route
      if (url.includes('/admin/')) {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
          this.token = adminToken;
        }
      }

      // Priority 2: Check for user session token
      if (!this.token) {
        const sessionToken = localStorage.getItem('session_token');
        if (sessionToken) {
          this.token = sessionToken;
        }
      }

      // Priority 3: Final fallback to adminToken for any route (in case of shared services used in admin panel)
      if (!this.token) {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
          this.token = adminToken;
        }
      }

      if (!this.token) {
        throw new Error('No authentication token available');
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Check if it's a network error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        // Network error - dispatch event to show NetworkError component
        window.dispatchEvent(new CustomEvent('network:error'));
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      throw error;
    }
  }

  // Method to handle file downloads (e.g. PDFs)
  async downloadFile(url, fileName) {
    if (!this.token) {
      this.token = localStorage.getItem('session_token') || localStorage.getItem('adminToken');
    }

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return { success: true };
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  // Setup real-time listeners for Supabase
  setupRealTimeListeners() {
    if (!this.supabase) {
      console.warn('Supabase client not initialized');
      return;
    }

    // Listen for investment changes
    const investmentChannel = this.supabase
      .channel('investments-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'investments'
        },
        (payload) => {
          console.log('Investment updated:', payload);
          // Trigger a refresh when investment data changes
          this._backgroundRefresh();
        }
      )
      .subscribe();

    // Listen for transaction changes
    const transactionChannel = this.supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction inserted:', payload);
          // Trigger a refresh when new transactions are added
          this._backgroundRefresh();
        }
      )
      .subscribe();

    // Store channels for cleanup
    this.realTimeListeners.set('investments', investmentChannel);
    this.realTimeListeners.set('transactions', transactionChannel);
  }

  // Cleanup real-time listeners
  cleanupRealTimeListeners() {
    this.realTimeListeners.forEach((channel, key) => {
      if (this.supabase) {
        this.supabase.removeChannel(channel);
      }
    });
    this.realTimeListeners.clear();
  }

  // Get dashboard data with caching - now includes all component data
  async getDashboardData(useCache = true) {
    // If cache is valid and we're allowed to use it, return cached data
    if (useCache && cacheService.isCacheValid()) {
      const cachedData = cacheService.getDashboardData();
      if (cachedData) {
        // Check if server events need update
        if (cachedData.server_events_update_flag === 'true') {
          // Trigger background refresh of events
          this._backgroundRefreshEvents();
        }
        // Trigger background refresh if needed
        if (cacheService.shouldTriggerBackgroundRefresh()) {
          // Start background refresh without blocking
          this._backgroundRefresh();
        }
        return cachedData;
      }
    }

    // Fetch fresh data from API - now includes due dates data
    try {
      const [dashboardData, dueDatesData] = await Promise.all([
        this.fetchWithAuth('/dashboard/data'),
        this.fetchWithAuth('/portfolio/due-dates-data').catch(err => null) // Catch errors to not block dashboard
      ]);

      // Combine the data
      const combinedData = { ...dashboardData };
      if (combinedData.success && dueDatesData) {
        combinedData.due_dates = dueDatesData;
      }

      // Check if server events need to be refreshed
      if (combinedData.success && combinedData.server_events_update_flag === 'true') {
        try {
          // Fetch fresh server events and update cache
          const freshEventsData = await this._fetchServerEvents();
          if (freshEventsData.success) {
            combinedData.server_events = freshEventsData;
            // Update the dashboard data to mark events as refreshed
            await this.fetchWithAuth('/admin/clear-server-events-flag', {
              method: 'POST'
            }).catch(err => console.warn('Failed to clear events flag:', err));
          }
        } catch (eventsError) {
          console.error('Failed to refresh server events:', eventsError);
          // Continue without events if refresh fails
        }
      }

      // Save to cache
      if (combinedData && combinedData.success) {
        cacheService.saveDashboardData(combinedData);

        // Dispatch event to notify UI of fresh data
        window.dispatchEvent(new CustomEvent('dashboard:refreshed', {
          detail: {
            lastUpdate: Date.now(),
            cacheAge: 0
          }
        }));
      }

      return combinedData;
    } catch (error) {
      // If we have cached data, return it even if API fails
      if (useCache) {
        const cachedData = cacheService.getDashboardData();
        if (cachedData) {
          return {
            ...cachedData,
            _fromCacheDueToError: true,
            _error: error.message
          };
        }
      }
      throw error;
    }
  }

  // Background refresh function - now includes due dates data
  async _backgroundRefresh() {
    try {
      const [dashboardData, dueDatesData] = await Promise.all([
        this.fetchWithAuth('/dashboard/data'),
        this.fetchWithAuth('/portfolio/due-dates-data').catch(err => null)
      ]);

      const combinedData = { ...dashboardData };
      if (combinedData.success && dueDatesData) {
        combinedData.due_dates = dueDatesData;
      }

      if (combinedData && combinedData.success) {
        // Check if data has actually changed
        const oldData = cacheService.getDashboardData();
        if (!oldData || cacheService.hasDataChanged(combinedData, oldData)) {
          cacheService.saveDashboardData(combinedData);

          // Dispatch event to notify UI of updated data
          window.dispatchEvent(new CustomEvent('dashboard:refreshed', {
            detail: {
              lastUpdate: Date.now(),
              cacheAge: 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Background refresh failed:', error);
    }
  }

  // Background refresh for server events
  async _backgroundRefreshEvents() {
    try {
      const freshEventsData = await this._fetchServerEvents();
      if (freshEventsData.success) {
        // Update cached dashboard data with fresh events
        const cachedData = cacheService.getDashboardData();
        if (cachedData) {
          cachedData.server_events = freshEventsData;
          cachedData.server_events_update_flag = false;
          cacheService.saveDashboardData(cachedData);

          // Clear the flag on server
          await this.fetchWithAuth('/admin/clear-server-events-flag', {
            method: 'POST'
          }).catch(err => console.warn('Failed to clear events flag:', err));

          // Dispatch event to notify UI of updated server events
          window.dispatchEvent(new CustomEvent('server-events:refreshed', {
            detail: freshEventsData
          }));
        }
      }
    } catch (error) {
      console.error('Background refresh events failed:', error);
    }
  }

  // Internal method to fetch server events
  async _fetchServerEvents() {
    try {
      const response = await this.fetchWithAuth('/admin/server-events?include_inactive=false');
      if (response.success) {
        // Transform to match dashboard structure
        return {
          events: response.events || [],
          count: response.count || 0
        };
      } else {
        console.warn('Server events fetch failed:', response.error);
        return { events: [], count: 0 };
      }
    } catch (error) {
      console.error('Failed to fetch server events:', error);
      return { events: [], count: 0 };
    }
  }

  // Admin methods for managing server events
  async getServerEvents(includeInactive = true) {
    try {
      const response = await this.fetchWithAuth(`/admin/server-events?include_inactive=${includeInactive}`);
      return response;
    } catch (error) {
      console.error('Failed to get server events:', error);
      throw error;
    }
  }

  async createServerEvent(eventData) {
    try {
      const response = await this.fetchWithAuth('/admin/server-events', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });
      return response;
    } catch (error) {
      console.error('Failed to create server event:', error);
      throw error;
    }
  }

  async updateServerEvent(eventId, updateData) {
    try {
      const response = await this.fetchWithAuth(`/admin/server-events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      return response;
    } catch (error) {
      console.error('Failed to update server event:', error);
      throw error;
    }
  }

  async deleteServerEvent(eventId) {
    try {
      const response = await this.fetchWithAuth(`/admin/server-events/${eventId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Failed to delete server event:', error);
      throw error;
    }
  }

  // Clear server events update flag
  async clearServerEventsFlag() {
    try {
      const response = await this.fetchWithAuth('/admin/clear-server-events-flag', {
        method: 'POST'
      });
      return response;
    } catch (error) {
      console.error('Failed to clear server events flag:', error);
      throw error;
    }
  }

  // Get user info
  async getUserInfo() {
    return this.fetchWithAuth('/dashboard/user');
  }

  // Get user investments
  async getInvestments() {
    return this.fetchWithAuth('/dashboard/investments');
  }

  // Get transaction history
  // Transaction History Cache
  transactionHistoryCache = {
    data: null,
    timestamp: 0,
    limit: 0
  };

  async getTransactionHistory(limit = 10, useCache = true) {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Check cache
    if (useCache &&
      this.transactionHistoryCache.data &&
      this.transactionHistoryCache.limit === limit &&
      (Date.now() - this.transactionHistoryCache.timestamp < CACHE_DURATION)) {
      return { success: true, data: this.transactionHistoryCache.data };
    }

    try {
      const result = await this.fetchWithAuth(`/dashboard/transactions?limit=${limit}`);

      if (result.success) {
        // Update cache
        this.transactionHistoryCache = {
          data: result.data,
          timestamp: Date.now(),
          limit: limit
        };
      }

      return result;
    } catch (error) {
      // Return cached data on error if available
      if (useCache && this.transactionHistoryCache.data) {
        return { success: true, data: this.transactionHistoryCache.data };
      }
      throw error;
    }
  }

  // Get monthly transaction summary
  async getMonthlyTransactionSummary() {
    try {
      // Get all transactions (no limit for accurate monthly calculation)
      const transactionsResponse = await this.fetchWithAuth('/dashboard/transactions?limit=1000');

      if (!transactionsResponse.success) {
        return { success: false, error: 'Failed to fetch transactions' };
      }

      const transactions = transactionsResponse.data || [];

      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter transactions for current month
      const monthlyTransactions = transactions.filter(transaction => {
        if (!transaction.created_at) return false;

        const transactionDate = new Date(transaction.created_at);
        return transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear;
      });

      // Calculate summary
      let income = 0;
      let expenses = 0;

      monthlyTransactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount) || 0;
        const type = transaction.transaction_type?.toLowerCase();

        if (type === 'payment' || type === 'initial') {
          income += amount;
        } else if (type === 'withdrawal') {
          expenses += amount;
        }
      });

      const savings = income - expenses;

      return {
        success: true,
        data: {
          income,
          expenses,
          savings,
          transactionCount: monthlyTransactions.length,
          month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
      };
    } catch (error) {
      console.error('Error fetching monthly transaction summary:', error);
      return { success: false, error: error.message };
    }
  }

  // Get due dates data
  async getDueDatesData() {
    return this.fetchWithAuth('/portfolio/due-dates-data');
  }

  // Get amount due
  async getAmountDue() {
    return this.fetchWithAuth('/portfolio/amount-due');
  }

  // Get weekly interest
  async getWeeklyInterest() {
    return this.fetchWithAuth('/portfolio/weekly-interest');
  }

  // Get investment expiry date
  async getInvestmentExpiryDate() {
    return this.fetchWithAuth('/portfolio/expiry-date');
  }

  // Get weeks remaining
  async getWeeksRemaining() {
    return this.fetchWithAuth('/portfolio/weeks-remaining');
  }

  // Get investor due dates with caching
  async getInvestorDueDates(investorId, useCache = true) {
    // If cache is valid and we're allowed to use it, return cached data
    if (useCache) {
      const cachedData = dueDatesCacheService.getDueDatesData(investorId);
      if (cachedData) {
        return {
          success: true,
          data: cachedData
        };
      }
    }

    // Fetch fresh data from API
    try {
      const data = await this.fetchWithAuth(`/due-dates/investor/${investorId}`);

      // Save to cache
      if (data && data.success) {
        dueDatesCacheService.saveDueDatesData(data.data, investorId);
      }

      return data;
    } catch (error) {
      // If we have cached data, return it even if API fails
      if (useCache) {
        const cachedData = dueDatesCacheService.getDueDatesData(investorId);
        if (cachedData) {
          return {
            success: true,
            data: cachedData
          };
        }
      }
      throw error;
    }
  }

  // Referral-related methods
  async getReferralCode() {
    return this.fetchWithAuth('/referral/code');
  }

  async getReferralStats() {
    return this.fetchWithAuth('/referral/stats');
  }

  async getUserPoints() {
    return this.fetchWithAuth('/referral/points');
  }

  async redeemPoints(amount) {
    return this.fetchWithAuth('/referral/redeem', {
      method: 'POST',
      body: JSON.stringify({ amount: parseInt(amount) })
    });
  }

  async getDownlines() {
    return this.fetchWithAuth('/referral/downlines');
  }

  // Delete user account
  async deleteAccount() {
    return this.fetchWithAuth('/auth/delete-account', {
      method: 'DELETE'
    });
  }

  // Add new investment account
  async renewInvestment(investorId) {
    return this.fetchWithAuth('/dashboard/renew-investment', {
      method: 'POST',
      body: JSON.stringify({ investor_id: investorId })
    });
  }

  async deleteTransaction(transactionId) {
    return this.fetchWithAuth('/dashboard/delete-transaction', {
      method: 'POST',
      body: JSON.stringify({ transaction_id: transactionId })
    });
  }

  // Add new investment account
  async addAccount(accountData) {
    return this.fetchWithAuth('/auth/add-account', {
      method: 'POST',
      body: JSON.stringify(accountData)
    });
  }

  // PDF Export methods
  // PDF Export methods - Return raw response for custom handling
  async exportTransactionReceipt(transactionId) {
    if (!this.token) {
      this.token = localStorage.getItem('session_token') || localStorage.getItem('adminToken');
    }
    return fetch(`${API_BASE_URL}/dashboard/export/receipt/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/pdf'
      }
    });
  }

  async exportTransactionHistory() {
    if (!this.token) {
      this.token = localStorage.getItem('session_token') || localStorage.getItem('adminToken');
    }
    return fetch(`${API_BASE_URL}/dashboard/export/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/pdf'
      }
    });
  }
}

// Create a singleton instance
const dashboardAPI = new DashboardAPI();

// Export the instance
export default dashboardAPI;
