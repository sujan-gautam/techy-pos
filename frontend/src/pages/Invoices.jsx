import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { FileText, Search, CreditCard, ChevronRight, Receipt } from 'lucide-react';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchInvoices = async (pageNum = 1) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/invoices?pageNumber=${pageNum}`);
            setInvoices(data.invoices);
            setPage(data.page);
            setTotalPages(data.pages);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices(page);
    }, [page]);

    if (loading && page === 1) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const getStatusStyles = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-50 text-green-700 border-green-200';
            case 'draft': return 'bg-gray-50 text-gray-700 border-gray-200';
            case 'sent': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'overdue': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Billing and payment history</p>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice ID</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Linked Job</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Total Amount</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                    No invoices generated yet
                                </td>
                            </tr>
                        ) : (
                            invoices.map((invoice) => (
                                <tr key={invoice._id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(invoice.status)}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link to={`/invoices/${invoice._id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                                            {invoice.invoiceId}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{invoice.customer.name}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{invoice.customer.phone || 'No phone'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-600">
                                        {invoice.jobId?.jobId || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-sm font-bold text-gray-900 font-mono">${invoice.total?.toFixed(2)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-xs text-gray-500 font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium tracking-tight">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="px-3 py-1 border border-gray-200 rounded bg-white text-[10px] font-bold text-gray-600 uppercase hover:bg-gray-50 disabled:opacity-30"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(page + 1)}
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

export default Invoices;
