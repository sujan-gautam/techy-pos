import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { RefreshCw, History, User, Clock } from 'lucide-react';

const AuditLogs = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = async (pageNum = 1) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/transactions?pageNumber=${pageNum}`);
            setTransactions(data.transactions);
            setPage(data.page);
            setTotalPages(data.pages);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    if (loading && page === 1) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const getLogTypeStyles = (type) => {
        switch (type) {
            case 'purchase_receive': return 'bg-green-50 text-green-700 border-green-100';
            case 'job_use': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'job_return': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'job_reserve': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'adjustment': return 'bg-orange-50 text-orange-700 border-orange-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-100 pb-6 mb-2">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">System Audit Logs</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Comprehensive trace of inventory movements and user operations</p>
                </div>
                <button
                    onClick={() => fetchLogs(page)}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-xs uppercase tracking-widest shadow-sm transition-all active:scale-95"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    <span>Synchronize History</span>
                </button>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Part Details</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Variance</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reference Path</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Performed By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                        No transaction records found
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-xs text-gray-900 font-semibold">
                                                <Clock size={12} className="mr-2 text-blue-400" />
                                                {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getLogTypeStyles(log.type)}`}>
                                                {log.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-gray-800">{log.partId?.name || 'Manual Entry'}</div>
                                            <div className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase mt-0.5">{log.partId?.sku || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${log.qtyChange > 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-red-700 bg-red-50 border border-red-100'}`}>
                                                    {log.qtyChange > 0 ? '+' : ''}{log.qtyChange}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold tracking-tight">
                                                    ({log.prevQty} → {log.newQty})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{log.referenceType}</div>
                                            {log.referenceId ? (
                                                <Link
                                                    to={log.referenceType === 'Job' ? `/jobs/${log.referenceId?._id}` : `/pos/${log.referenceId?._id}`}
                                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
                                                >
                                                    <History size={10} className="mr-1" />
                                                    {log.referenceId?.poId || log.referenceId?.jobId || 'View Record'}
                                                </Link>
                                            ) : (
                                                <span className="text-[10px] text-gray-300 font-bold uppercase italic">No Link</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-3">
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-gray-900 leading-none">{log.performedBy?.name || 'System'}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{log.performedBy?.role || 'AUTO'}</p>
                                                </div>
                                                <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-blue-600 shadow-sm">
                                                    {(log.performedBy?.name || 'S').charAt(0)}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="px-4 py-1.5 border border-gray-200 rounded-lg bg-white text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:bg-white hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-30 shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                className="px-4 py-1.5 border border-gray-200 rounded-lg bg-white text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:bg-white hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-30 shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
