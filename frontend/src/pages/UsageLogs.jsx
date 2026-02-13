import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
    History, Search, Filter, Calendar, User, Package,
    ChevronDown, Download, AlertCircle, Clock, Smartphone
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import ListSkeleton from '../components/skeletons/ListSkeleton';

const UsageLogs = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    // Filters
    const [startDate, setStartDate] = useState(format(startOfDay(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedUser, setSelectedUser] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/transactions', {
                params: {
                    startDate,
                    endDate,
                    userId: selectedUser,
                    pageNumber: 1
                }
            });

            setTransactions(data.transactions);
            const usersRes = await api.get('/users');
            setUsers(usersRes.data);

        } catch (error) {
            toast.error('Failed to load usage history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate, selectedUser]);

    const filteredLogs = useMemo(() => {
        return transactions.filter(tx => {
            const isJobUse = tx.type === 'job_use';
            const isReturn = tx.type === 'job_return';
            const isNegativeAdj = tx.type === 'adjustment' && tx.qtyChange < 0;
            const isUsage = isJobUse || isReturn || isNegativeAdj;

            if (!showAll && !isUsage) return false;

            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                return (
                    tx.partId?.name?.toLowerCase().includes(search) ||
                    tx.partId?.sku?.toLowerCase().includes(search) ||
                    tx.note?.toLowerCase().includes(search)
                );
            }
            return true;
        });
    }, [transactions, searchTerm, showAll]);

    // Group logs by day
    const groupedLogs = useMemo(() => {
        const groups = {};
        filteredLogs.forEach(tx => {
            // Use local date for grouping
            const date = new Date(tx.timestamp);
            const dateStr = format(date, 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(tx);
        });

        return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({
            date,
            items: groups[date]
        }));
    }, [filteredLogs]);

    if (loading && transactions.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2"></div>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>
                        ))}
                    </div>
                </div>
                <ListSkeleton items={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Usage History</h1>
                    <p className="text-gray-500 text-sm mt-1">Track inventory changes and part consumption</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-gray-100 p-1 rounded-md">
                        <button
                            onClick={() => setShowAll(true)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${showAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setShowAll(false)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${!showAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Usage only
                        </button>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                        title="Export"
                    >
                        <Download size={16} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">From</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">To</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Staff member</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            <option value="">All staff</option>
                            {users.filter(u => u.role === 'technician' || u.role === 'admin' || u.role === 'manager').map(u => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Search</label>
                        <input
                            type="text"
                            placeholder="Part name or SKU..."
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Logs Timeline */}
            <div className="space-y-6">
                {groupedLogs.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <Package size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No records found</p>
                    </div>
                ) : (
                    groupedLogs.map(group => (
                        <div key={group.date} className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <span className="text-xs font-semibold text-gray-700">
                                    {isToday(new Date(group.date + 'T00:00:00')) ? 'Today' :
                                        isYesterday(new Date(group.date + 'T00:00:00')) ? 'Yesterday' :
                                            format(new Date(group.date + 'T00:00:00'), 'EEEE, MMM d')}
                                </span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs text-gray-500">{group.items.length} {group.items.length === 1 ? 'transaction' : 'transactions'}</span>
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-sm">
                                {group.items.map(tx => (
                                    <div key={tx._id} className="p-5 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-4 flex-1">
                                                <div className={`w-12 h-12 rounded flex items-center justify-center text-sm font-bold flex-shrink-0 ${tx.qtyChange > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}>
                                                    {tx.qtyChange > 0 ? `+${tx.qtyChange}` : tx.qtyChange}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h3 className="text-sm font-semibold text-gray-900">{tx.partId?.name}</h3>
                                                        <span className="text-xs text-gray-400 font-mono">{tx.partId?.sku}</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-gray-500 font-medium">Performed by:</span>
                                                            <span className="text-gray-900 font-semibold">{tx.performedBy?.name || 'Unknown'}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-gray-500 font-medium">Time:</span>
                                                            <span className="text-gray-900">{format(new Date(tx.timestamp), 'MMM d, yyyy h:mm a')}</span>
                                                        </div>

                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-gray-500 font-medium">Previous stock:</span>
                                                            <span className="text-gray-900">{tx.prevQty !== undefined ? tx.prevQty : 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-gray-500 font-medium">New stock:</span>
                                                            <span className="text-gray-900 font-semibold">{tx.newQty !== undefined ? tx.newQty : 'N/A'}</span>
                                                        </div>

                                                        {tx.referenceId && (
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-gray-500 font-medium">Job reference:</span>
                                                                <span className="text-blue-600 font-semibold">#{tx.referenceId.jobId || 'N/A'}</span>
                                                            </div>
                                                        )}

                                                        {tx.reason && (
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-gray-500 font-medium">Reason:</span>
                                                                <span className="text-gray-900">{tx.reason.replace(/_/g, ' ')}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {tx.note && (
                                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                                            <p className="text-xs text-gray-600">
                                                                <span className="font-medium text-gray-500">Note: </span>
                                                                {tx.note}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`text-xs font-medium px-2.5 py-1 rounded flex-shrink-0 ml-4 ${tx.type === 'job_use' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                tx.type === 'job_return' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                                    tx.qtyChange > 0 ? 'bg-green-50 text-green-700 border border-green-200' :
                                                        'bg-gray-50 text-gray-700 border border-gray-200'
                                                }`}>
                                                {tx.type === 'job_use' ? 'Used' :
                                                    tx.type === 'job_return' ? 'Returned' :
                                                        tx.qtyChange > 0 ? 'Added' : 'Removed'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default UsageLogs;
