import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Search, Filter, Download, MoreHorizontal, Trash2, Share2, AlertCircle, Printer } from 'lucide-react';
import dashboardAPI from '../services/dashboardAPI';

const TransactionHistory = ({ limit, onReportIssue, transactions: propTransactions, showHeader = true, showSeeAll = true, showTitle = true }) => {
  const [transactions, setTransactions] = useState(propTransactions || []);
  const [loading, setLoading] = useState(propTransactions ? false : true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [allTransactions, setAllTransactions] = useState(propTransactions || []);
  const [isExporting, setIsExporting] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (propTransactions) {
      setTransactions(propTransactions);
      setAllTransactions(propTransactions);
      setLoading(false);
    } else {
      fetchTransactions();
    }
  }, [limit, propTransactions]);

  const fetchTransactions = async (fetchLimit = limit) => {
    if (propTransactions) return; // Don't fetch if transactions are provided as props

    try {
      setLoading(true);
      const response = await dashboardAPI.getTransactionHistory(fetchLimit);
      if (response.success) {
        setTransactions(response.data);
        if (fetchLimit !== limit && fetchLimit === null) {
          // If we fetched all transactions, store them
          setAllTransactions(response.data);
        }
      } else {
        setError(response.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError('An error occurred while fetching transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = () => {
    if (!expanded) {
      // Get all transactions if we don't have them yet
      if (allTransactions.length === 0) {
        fetchTransactions(null); // null means get all
      } else {
        setTransactions(allTransactions);
      }
      setExpanded(true);
    } else {
      // Go back to limited view
      if (limit) {
        fetchTransactions(limit);
      }
      setExpanded(false);
    }
  };

  const handleDelete = async (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      try {
        const response = await dashboardAPI.deleteTransaction(transactionId);
        if (response.success) {
          // Remove from local state
          setTransactions(transactions.filter(t => t.transaction_id !== transactionId));
          setActionMenuOpen(null);
          setShowDetailsModal(false);
        } else {
          alert('Failed to delete transaction: ' + response.error);
        }
      } catch (err) {
        console.error('Error deleting transaction:', err);
        alert('An error occurred while deleting the transaction');
      }
    }
  };

  const handleShare = async (transaction) => {
    const shareData = {
      title: 'Transaction Receipt',
      text: `Transaction Details:\nType: ${transaction.transaction_type}\nAmount: ₦${transaction.amount}\nDate: ${new Date(transaction.created_at).toLocaleDateString()}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.text);
        alert('Transaction details copied to clipboard!');
      }
      setActionMenuOpen(null);
    } catch (err) {
      console.error('Error sharing transaction:', err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await dashboardAPI.getUserInfo();
      if (response.success) {
        setUserProfile(response.user);
      }
    } catch (err) {
      console.error('Error fetching user profile for print:', err);
    }
  };

  const handlePrintHistory = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      await dashboardAPI.exportTransactionHistory();
      setIsExporting(false);
    } catch (err) {
      console.error('Export History failed:', err);
      setIsExporting(false);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrintReceipt = async (transaction) => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      await dashboardAPI.exportTransactionReceipt(transaction.transaction_id);
      setIsExporting(false);
      setActionMenuOpen(null);
    } catch (err) {
      console.error('Export Receipt failed:', err);
      setIsExporting(false);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleReport = (transaction) => {
    if (onReportIssue) {
      onReportIssue({
        category: 'financial',
        message: `ISSUE REPORT - TRANSACTION #${transaction.transaction_id}\n\nTransaction Details:\n-------------------\nType: ${transaction.transaction_type}\nAmount: ₦${transaction.amount}\nDate: ${new Date(transaction.created_at).toLocaleDateString()}\nStatus: ${transaction.status}\n\nDescription of Issue:\n-------------------\n[Please describe your issue here]`
      });
      setActionMenuOpen(null);
      setShowDetailsModal(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || transaction.transaction_type?.toLowerCase() === filter;
    const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-700 bg-green-100';
      case 'pending': return 'text-yellow-700 bg-yellow-100';
      case 'failed': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getIcon = (type) => {
    return type === 'withdrawal' ?
      <ArrowUpRight className="w-5 h-5 text-red-500" /> :
      <ArrowDownLeft className="w-5 h-5 text-green-500" />;
  };

  const openDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
    setActionMenuOpen(null);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (error) return (
    <div className="text-center text-red-500 p-4 bg-red-50 rounded-lg">
      {error}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {showHeader && (
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {showTitle && <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>}

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 text-gray-900 placeholder-gray-500 bg-white"
                />
              </div>

              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer text-gray-900"
                >
                  <option value="all">All Types</option>
                  <option value="payment">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="interest">Interest</option>
                </select>
                <Filter className="w-4 h-4 absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              <button
                onClick={handlePrintHistory}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-md disabled:bg-blue-300"
              >
                {isExporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Printer className="w-4 h-4" />}
                <span className="hidden sm:inline">Print Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${transaction.transaction_type === 'withdrawal' ? 'bg-red-50' : 'bg-green-50'} mr-3`}>
                        {getIcon(transaction.transaction_type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description || transaction.transaction_type}
                        </div>
                        <div className="text-xs text-gray-500">ID: {transaction.transaction_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 capitalize">{transaction.transaction_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${transaction.transaction_type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                      {transaction.transaction_type === 'withdrawal' ? '-' : '+'}₦{parseFloat(transaction.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === transaction.id ? null : transaction.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {actionMenuOpen === transaction.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-100 py-1">
                        <button
                          onClick={() => openDetails(transaction)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleShare(transaction)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <Share2 className="w-4 h-4 mr-2" /> Share Receipt
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(transaction)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <Printer className="w-4 h-4 mr-2" /> Print Receipt
                        </button>
                        <button
                          onClick={() => handleReport(transaction)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <AlertCircle className="w-4 h-4 mr-2" /> Report Issue
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.transaction_id)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                  No transactions found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* See All / See Less Button */}
      {showSeeAll && limit && transactions.length === limit && !expanded && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-center">
          <button
            onClick={toggleExpanded}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors inline-flex items-center"
          >
            See All Transactions
            <ArrowDownLeft className="w-4 h-4 ml-1 rotate-[-45deg]" />
          </button>
        </div>
      )}

      {showSeeAll && expanded && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-center">
          <button
            onClick={toggleExpanded}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors inline-flex items-center"
          >
            See Less
            <ArrowUpRight className="w-4 h-4 ml-1 rotate-[-45deg]" />
          </button>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-teal-800 text-white px-6 py-4 border-b border-blue-500 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Transaction Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-6 bg-white">
              <div className="flex justify-center mb-6">
                <div className={`p-4 rounded-full ${selectedTransaction.transaction_type === 'withdrawal' ? 'bg-red-100' : 'bg-green-100'}`}>
                  {selectedTransaction.transaction_type === 'withdrawal' ?
                    <ArrowUpRight className="w-8 h-8 text-red-600" /> :
                    <ArrowDownLeft className="w-8 h-8 text-green-600" />
                  }
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-3">
                  {selectedTransaction.transaction_type === 'withdrawal' ? '-' : '+'}<span className="text-green-600">₦</span>{parseFloat(selectedTransaction.amount).toLocaleString()}
                </div>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold shadow-md ${getStatusColor(selectedTransaction.status)}`}>
                  {selectedTransaction.status}
                </div>
              </div>

              <div className="space-y-4 border-t border-gray-200 pt-4 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Type</span>
                  <span className="font-semibold text-gray-900 capitalize">{selectedTransaction.transaction_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Date</span>
                  <span className="font-semibold text-gray-900">{new Date(selectedTransaction.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Transaction ID</span>
                  <span className="font-semibold text-gray-900 text-sm font-mono bg-gray-200 px-2 py-1 rounded">{selectedTransaction.transaction_id}</span>
                </div>
                {selectedTransaction.description && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Description</span>
                    <span className="font-semibold text-gray-900">{selectedTransaction.description}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleShare(selectedTransaction)}
                  className="flex flex-col items-center justify-center p-3 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700 border border-transparent hover:border-blue-200"
                >
                  <Share2 className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Share</span>
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedTransaction)}
                  className="flex flex-col items-center justify-center p-3 hover:bg-amber-50 rounded-lg transition-colors text-amber-600 hover:text-amber-700 border border-transparent hover:border-amber-200"
                >
                  <Printer className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Print</span>
                </button>
                <button
                  onClick={() => handleReport(selectedTransaction)}
                  className="flex flex-col items-center justify-center p-3 hover:bg-green-50 rounded-lg transition-colors text-green-600 hover:text-green-700 border border-transparent hover:border-green-200"
                >
                  <AlertCircle className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Report</span>
                </button>
                <button
                  onClick={() => handleDelete(selectedTransaction.transaction_id)}
                  className="flex flex-col items-center justify-center p-3 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700 border border-transparent hover:border-red-200"
                >
                  <Trash2 className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Delete</span>
                </button>
              </div>
            </div>

            <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
