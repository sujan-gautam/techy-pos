import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Users, Search, Phone, Mail, ChevronRight, User } from 'lucide-react';
import TableSkeleton from '../components/skeletons/TableSkeleton';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchCustomers = async (pageNum = 1, search = '') => {
        setLoading(true);
        try {
            const { data } = await api.get(`/customers?pageNumber=${pageNum}&keyword=${search}`);
            setCustomers(data.customers);
            setPage(data.page);
            setTotalPages(data.pages);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchCustomers(1, keyword);
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [keyword]);

    if (loading && page === 1) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2"></div>
                    </div>
                    <div className="h-10 w-72 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <TableSkeleton rows={8} columns={5} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage client records and history</p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search name, phone, email..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client Info</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Details</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Service History</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Activity</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                    No customer records found
                                </td>
                            </tr>
                        ) : (
                            customers.map((c) => (
                                <tr key={c._id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {c.name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Active Client</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-xs text-gray-600 font-medium mb-1">
                                            <Phone size={12} className="mr-2 text-blue-400" /> {c.phone || 'N/A'}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-600 font-medium">
                                            <Mail size={12} className="mr-2 text-blue-400" /> {c.email || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-wider">
                                            {c.jobCount} Interactions
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                                        {new Date(c.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            to={`/customers/${c._id}`}
                                            className="inline-flex items-center space-x-1 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                        >
                                            <span>History</span>
                                            <ChevronRight size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Simplified Pagination */}
                {totalPages > 1 && (
                    <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium tracking-tight">
                            Showing page {page} of {totalPages}
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => fetchCustomers(page - 1, keyword)}
                                disabled={page === 1}
                                className="px-3 py-1 border border-gray-200 rounded bg-white text-[10px] font-bold text-gray-600 uppercase hover:bg-gray-50 disabled:opacity-30"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => fetchCustomers(page + 1, keyword)}
                                disabled={page === totalPages}
                                className="px-3 py-1 border border-gray-200 rounded bg-white text-[10px] font-bold text-gray-600 uppercase hover:bg-gray-50 disabled:opacity-30"
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

export default Customers;
