import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { Plus, ShoppingCart, ChevronRight, Clock, Package } from 'lucide-react';
import TableSkeleton from '../components/skeletons/TableSkeleton';

const PurchaseOrders = () => {
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPOs = async () => {
            try {
                const { data } = await api.get('/pos');
                setPos(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchPOs();
    }, []);

    if (loading) return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-80 bg-gray-100 rounded animate-pulse mt-2"></div>
                </div>
                <div className="h-10 w-36 bg-blue-100 rounded animate-pulse"></div>
            </div>
            <TableSkeleton rows={8} columns={6} />
        </div>
    );

    const getStatusStyles = (status) => {
        switch (status) {
            case 'received': return 'bg-green-50 text-green-700 border-green-100';
            case 'ordered': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'partial_received': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-4">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-100 pb-6 mb-2">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Procurement and incoming stock manifest</p>
                </div>
                <Link to="/pos/new" className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm shadow-md transition-all active:scale-95">
                    <Plus size={18} />
                    <span>Generate Order</span>
                </Link>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vendor / Source</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Batch Size</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected ETD</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Commit Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pos.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                        No purchase records found
                                    </td>
                                </tr>
                            ) : (
                                pos.map((po) => (
                                    <tr key={po._id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(po.status)}`}>
                                                {po.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link to={`/pos/${po._id}`} className="text-sm font-bold text-blue-600 hover:text-blue-800">
                                                {po.poId}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{po.supplier}</div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Verified Supplier</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[10px] font-bold text-gray-600 group-hover:bg-white transition-colors">
                                                <Package size={12} className="text-gray-400" />
                                                <span>{po.items?.length || 0} ITEMS</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-xs text-gray-500 font-semibold">
                                                <Clock size={12} className="mr-2 text-blue-400" />
                                                {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-xs text-gray-400 font-semibold uppercase tracking-tight">{new Date(po.createdAt).toLocaleDateString()}</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrders;
