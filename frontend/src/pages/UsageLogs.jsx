import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
    History, Search, Filter, Calendar, User, Package,
    ChevronDown, Download, AlertCircle, Clock, Smartphone
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';

const UsageLogs = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    // Filters
    const [startDate, setStartDate] = useState(format(startOfDay(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedUser, setSelectedUser] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(true); // Default to seeing everything

    const fetchData = async () => {
        setLoading(true);
        try {
            // Type filter: if not showing all, only fetch usage-related types
            // But actually fetching all and filtering in FE is more flexible for "usage vs all" toggle.
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
            // Filter criteria
            const isJobUse = tx.type === 'job_use';
            const isReturn = tx.type === 'job_return';
            const isNegativeAdj = tx.type === 'adjustment' && tx.qtyChange < 0;
            const isUsage = isJobUse || isReturn || isNegativeAdj;

            // If not showAll, only return usage items
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
            const dateStr = format(new Date(tx.timestamp), 'yyyy-MM-dd');
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
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Material Usage History</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Track and audit part consumption across all jobs</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setShowAll(true)}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${showAll ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            All Activity
                        </button>
                        <button
                            onClick={() => setShowAll(false)}
                            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${!showAll ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Usage Only
                        </button>
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <button
                        onClick={() => window.print()}
                        className="p-2.5 text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-lg transition-all shadow-sm"
                        title="Print Report"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Global Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">From Date</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold transition-all outline-none"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">To Date</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold transition-all outline-none"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Technician</label>
                        <div className="relative">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold transition-all outline-none appearance-none"
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                            >
                                <option value="">All Staff</option>
                                {users.filter(u => u.role === 'technician' || u.role === 'admin' || u.role === 'manager').map(u => (
                                    <option key={u._id} value={u._id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Search Items</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Filter by SKU or Part..."
                                className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Timeline */}
            <div className="space-y-8">
                {groupedLogs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-20 text-center">
                        <Package size={48} className="mx-auto text-gray-100 mb-4" />
                        <p className="text-gray-400 font-medium">No usage records found for selected filters.</p>
                    </div>
                ) : (
                    groupedLogs.map(group => (
                        <div key={group.date} className="space-y-4">
                            <div className="flex items-center space-x-4">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${isToday(new Date(group.date)) ? 'bg-blue-600 text-white border-blue-600' :
                                    isYesterday(new Date(group.date)) ? 'bg-gray-800 text-white border-gray-800' :
                                        'bg-white text-gray-500 border-gray-200'
                                    }`}>
                                    {isToday(new Date(group.date)) ? 'Today' :
                                        isYesterday(new Date(group.date)) ? 'Yesterday' :
                                            format(new Date(group.date), 'EEEE, MMM do')}
                                </span>
                                <div className="flex-1 h-px bg-gray-100"></div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{group.items.length} materials logged</span>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden shadow-sm">
                                {group.items.map(tx => (
                                    <div key={tx._id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-blue-600 border border-gray-100 font-bold group-hover:scale-110 transition-transform">
                                                {tx.qtyChange > 0 ? `+${tx.qtyChange}` : tx.qtyChange}
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-bold text-gray-900">{tx.partId?.name}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-tighter">[{tx.partId?.sku}]</span>
                                                </div>
                                                <div className="flex items-center space-x-3 mt-1">
                                                    <div className="flex items-center text-[10px] text-gray-500 font-medium">
                                                        <User size={10} className="mr-1" />
                                                        {tx.performedBy?.name}
                                                    </div>
                                                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                                    <div className="flex items-center text-[10px] text-gray-500 font-medium">
                                                        <Clock size={10} className="mr-1" />
                                                        {format(new Date(tx.timestamp), 'hh:mm aa')}
                                                    </div>
                                                    {tx.referenceId && (
                                                        <>
                                                            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                                            <div className="flex items-center text-[10px] text-blue-600 font-bold">
                                                                <Smartphone size={10} className="mr-1" />
                                                                #{tx.referenceId.jobId || 'Job'}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tight ${tx.type === 'job_use' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                tx.type === 'job_return' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    tx.qtyChange > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        'bg-purple-50 text-purple-600 border-purple-100'
                                                }`}>
                                                {tx.type === 'job_use' ? 'Job Use' :
                                                    tx.type === 'job_return' ? 'Job Return' :
                                                        tx.qtyChange > 0 ? 'Stock Intake' :
                                                            'Adjustment'}
                                            </div>
                                            {tx.note && <div className="text-[10px] text-gray-400 italic mt-1 max-w-[200px] truncate">{tx.note}</div>}
                                            {tx.reason && tx.reason !== tx.type && <div className="text-[10px] text-gray-300 uppercase font-bold mt-0.5 tracking-tighter">{tx.reason.replace('_', ' ')}</div>}
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
