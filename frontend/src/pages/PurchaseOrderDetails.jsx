import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { ArrowLeft, Check, Package } from 'lucide-react';

const PurchaseOrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [po, setPo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Receive Modal
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [receiveItems, setReceiveItems] = useState([]);
    const [note, setNote] = useState('');

    const fetchPO = async () => {
        try {
            const { data } = await api.get(`/pos/${id}`);
            setPo(data);
            // Initialize receive items with remaining quantities
            const itemsToReceive = data.items.map(item => ({
                partId: item.partId._id,
                name: item.partId.name,
                remaining: item.orderedQty - item.receivedQty,
                qtyToReceive: item.orderedQty - item.receivedQty, // Default to full remaining
                serialNumbers: [] // Comma separated string or array
            })).filter(item => item.remaining > 0);
            setReceiveItems(itemsToReceive);
        } catch (error) {
            toast.error('Failed to load PO');
            navigate('/pos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPO();
    }, [id]);

    const handleReceiveSubmit = async () => {
        try {
            // Filter out 0 qty
            const payloadItems = receiveItems
                .filter(item => item.qtyToReceive > 0)
                .map(item => ({
                    partId: item.partId,
                    qty: Number(item.qtyToReceive),
                    serialNumbers: typeof item.serialNumbers === 'string'
                        ? item.serialNumbers.split(',').map(s => s.trim()).filter(s => s)
                        : item.serialNumbers
                }));

            if (payloadItems.length === 0) {
                toast.error('No items to receive');
                return;
            }

            await api.post(`/pos/${id}/receive`, {
                items: payloadItems,
                note
            });

            toast.success('Stock Received Successfully');
            setShowReceiveModal(false);
            fetchPO();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to receive');
        }
    };

    const updateReceiveItem = (index, field, value) => {
        const newItems = [...receiveItems];
        newItems[index][field] = value;
        setReceiveItems(newItems);
    };

    if (loading) return <div>Loading...</div>;
    if (!po) return <div>PO not found</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-100 pb-6 mb-2">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/pos')} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-all active:scale-95 shadow-sm">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-2 mb-0.5">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100">Purchase Order</span>
                            <h1 className="text-xl font-bold text-gray-900">{po.poId}</h1>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">{po.supplier} • Ordered {new Date(po.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border shadow-sm
                        ${po.status === 'received' ? 'bg-green-50 text-green-700 border-green-200' :
                            po.status === 'ordered' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {po.status.replace('_', ' ')}
                    </span>
                    {po.status !== 'received' && po.status !== 'cancelled' && (
                        <button
                            onClick={() => setShowReceiveModal(true)}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-blue-700 font-bold text-sm shadow-md transition-all active:scale-95"
                        >
                            <Package size={18} />
                            <span>Receive Stock</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="font-bold text-gray-900">Order Items</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{po.items.length} {po.items.length === 1 ? 'Item' : 'Items'}</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Part Details</th>
                                <th className="px-6 py-4">Ordered</th>
                                <th className="px-6 py-4">Received</th>
                                <th className="px-6 py-4 text-center">Remaining</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {po.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{item.partId?.name}</div>
                                        <div className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase tracking-tighter">{item.partId?.sku}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{item.orderedQty}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{item.receivedQty}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-sm font-bold ${item.orderedQty - item.receivedQty > 0 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-gray-400 bg-gray-50 border-gray-100'} px-2 py-0.5 rounded border`}>
                                            {item.orderedQty - item.receivedQty}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {item.receivedQty >= item.orderedQty ? (
                                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                                <Check size={12} className="mr-1.5" /> FULFILLED
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                                PENDING
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receive Modal */}
            {showReceiveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowReceiveModal(false)}></div>
                    <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-gray-900 px-8 py-8 text-white relative">
                            <button
                                onClick={() => setShowReceiveModal(false)}
                                className="absolute right-6 top-6 p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                            >
                                <ArrowLeft size={18} className="rotate-180" />
                            </button>
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight">Receive Stock</h3>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Incoming Inventory Check</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {receiveItems.map((item, idx) => (
                                <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-6 hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-sm font-bold text-gray-900">{item.name}</span>
                                            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-tight mt-0.5">Remaining: {item.remaining}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Quantity Received</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={item.remaining}
                                                value={item.qtyToReceive}
                                                onChange={(e) => updateReceiveItem(idx, 'qtyToReceive', e.target.value)}
                                                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Serials (Optional)</label>
                                            <input
                                                type="text"
                                                value={item.serialNumbers}
                                                onChange={(e) => updateReceiveItem(idx, 'serialNumbers', e.target.value)}
                                                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                                placeholder="S123, S456..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {receiveItems.length === 0 && (
                                <div className="text-center py-10 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <Check size={32} className="text-emerald-500 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-emerald-700">All materials have been fully processed</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Notes / Reference</label>
                                <textarea
                                    rows="2"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                                    placeholder="Add shipment notes or tracking numbers..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/30">
                            <button
                                onClick={() => setShowReceiveModal(false)}
                                className="px-6 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReceiveSubmit}
                                disabled={receiveItems.length === 0}
                                className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                            >
                                Confirm Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderDetails;
