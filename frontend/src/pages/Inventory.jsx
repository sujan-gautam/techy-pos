import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import {
    Plus, Search, Filter, AlertCircle, Edit,
    Wrench, Download, X, MoreHorizontal,
    Minus
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import TableSkeleton from '../components/skeletons/TableSkeleton';

const Inventory = () => {
    const { user } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Apple');
    const [selectedCategory, setSelectedCategory] = useState('Screen');
    const [selectedSeries, setSelectedSeries] = useState('all');

    // Modals
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form States
    const [adjustmentQty, setAdjustmentQty] = useState(0);
    const [assignmentQty, setAssignmentQty] = useState(1);
    const [assignmentNote, setAssignmentNote] = useState('');
    const [selectedJob, setSelectedJob] = useState('');
    const [activeJobs, setActiveJobs] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canManageStock = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';

    const fetchData = async () => {
        try {
            const { data } = await api.get('/inventory');
            setInventory(data);
        } catch (error) {
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    const fetchJobs = async () => {
        try {
            const { data } = await api.get('/jobs?status=in_progress');
            setActiveJobs(data.jobs || []);
        } catch (error) {
            console.error('Job fetch error', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Reset series filter when brand or category changes
    useEffect(() => {
        setSelectedSeries('all');
    }, [selectedBrand, selectedCategory]);

    const seriesList = useMemo(() => {
        const series = new Set();
        inventory.forEach(item => {
            if (item.partId?.brand === selectedBrand && item.partId?.category === selectedCategory) {
                if (item.partId?.series) series.add(item.partId.series);
            }
        });
        return Array.from(series).sort();
    }, [inventory, selectedBrand, selectedCategory]);

    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const part = item.partId;
            if (!part) return false;

            const matchesSearch =
                part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.sku?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesBrand = part.brand === selectedBrand;
            const matchesCategory = part.category === selectedCategory;
            const matchesSeries = selectedSeries === 'all' || part.series === selectedSeries;

            return matchesSearch && matchesBrand && matchesCategory && matchesSeries;
        });
    }, [inventory, searchTerm, selectedBrand, selectedCategory, selectedSeries]);

    const handleAdjust = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.patch(`/inventory/${selectedItem._id}/adjust`, {
                qtyChange: Number(adjustmentQty),
                reason: 'manual'
            });
            toast.success('Stock updated');
            setShowAdjustModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!selectedJob) {
            toast.error('Please select a job');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post(`/jobs/${selectedJob}/parts/use`, {
                partId: selectedItem.partId._id,
                qty: Number(assignmentQty),
                note: assignmentNote
            });
            toast.success('Part assigned to job');
            setShowAssignModal(false);
            setAssignmentNote('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Assignment failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2"></div>
                    </div>
                </div>
                <TableSkeleton rows={8} columns={5} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage parts and track stock levels across the shop.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <Download size={16} />
                        <span>Export</span>
                    </button>
                    <button className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm transition-all active:scale-95">
                        <Plus size={16} />
                        <span>Add Item</span>
                    </button>
                </div>
            </div>

            {/* Combined Filters and Search */}
            <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="flex bg-gray-100 p-1 rounded-md">
                            {['Apple', 'Samsung'].map(brand => (
                                <button
                                    key={brand}
                                    onClick={() => setSelectedBrand(brand)}
                                    className={clsx(
                                        "px-4 py-1.5 text-xs font-semibold rounded transition-all",
                                        selectedBrand === brand ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    {brand}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-md">
                            {['Screen', 'Battery'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={clsx(
                                        "px-4 py-1.5 text-xs font-semibold rounded transition-all",
                                        selectedCategory === cat ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    {cat}s
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or SKU..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Series Quick Filter Bar */}
                {seriesList.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-2 flex items-center space-x-2 overflow-x-auto no-scrollbar shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase px-2">Series:</span>
                        <button
                            onClick={() => setSelectedSeries('all')}
                            className={clsx(
                                "px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                                selectedSeries === 'all' ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            All {selectedBrand}s
                        </button>
                        {seriesList.map(series => (
                            <button
                                key={series}
                                onClick={() => setSelectedSeries(series)}
                                className={clsx(
                                    "px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors mb-0.5",
                                    selectedSeries === series ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-gray-500 hover:bg-gray-50"
                                )}
                            >
                                {series}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Part Name</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">In Stock</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                        No items found.
                                    </td>
                                </tr>
                            ) : (
                                filteredInventory.map(item => (
                                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono tracking-tighter">{item.partId?.sku}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{item.partId?.name}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{item.partId?.series}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={clsx(
                                                "text-sm font-bold tabular-nums",
                                                item.quantity === 0 ? "text-red-600 bg-red-50 px-2 py-0.5 rounded" :
                                                    item.quantity <= (item.partId?.reorder_threshold || 5) ? "text-amber-600 bg-amber-50 px-2 py-0.5 rounded" : "text-gray-900"
                                            )}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusPill quantity={item.quantity} threshold={item.partId?.reorder_threshold || 5} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setAssignmentQty(1);
                                                        setAssignmentNote('');
                                                        fetchJobs();
                                                        setShowAssignModal(true);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Assign to Job"
                                                >
                                                    <Wrench size={16} />
                                                </button>
                                                {canManageStock && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setAdjustmentQty(0);
                                                            setShowAdjustModal(true);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                        title="Update Stock"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Adjust Stock Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-sm shadow-xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Stock Adjustment</h2>
                            <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAdjust} className="p-6 space-y-6">
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Product</p>
                                <p className="text-sm font-bold text-gray-900">{selectedItem?.partId?.name}</p>
                                <p className="text-xs text-gray-500 font-mono">{selectedItem?.partId?.sku}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Current Stock</label>
                                    <div className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm font-bold text-gray-800">
                                        {selectedItem?.quantity}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Change (+/-)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        value={adjustmentQty}
                                        onChange={(e) => setAdjustmentQty(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border border-gray-100 rounded-md flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500">New Quantity</span>
                                <span className="text-xl font-black text-gray-900 tabular-nums">
                                    {Number(selectedItem?.quantity) + Number(adjustmentQty)}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-md border border-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || Number(adjustmentQty) === 0}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Part Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-900">Assign to Job</h2>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAssign} className="p-6 space-y-6">
                            {/* Item Header */}
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-gray-900">{selectedItem?.partId?.name}</p>
                                <p className="text-[11px] text-gray-500 font-mono tracking-wider uppercase">SKU: {selectedItem?.partId?.sku}</p>
                                <div className="flex items-center space-x-2 pt-1">
                                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                                    <p className="text-xs text-gray-600 font-medium">Available Inventory: <span className="font-bold text-gray-900 lowercase">{selectedItem?.quantity} units</span></p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Job Selector */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Repair Job</label>
                                    <select
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none appearance-none cursor-pointer"
                                        value={selectedJob}
                                        onChange={(e) => setSelectedJob(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose active job...</option>
                                        {activeJobs.map(job => (
                                            <option key={job._id} value={job._id}>#{job.jobId} &mdash; {job.device_model} ({job.customer?.name})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity Selector - Big Tech POS Style */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Usage Quantity</label>
                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setAssignmentQty(Math.max(1, assignmentQty - 1))}
                                            className="p-3 text-gray-400 hover:text-gray-900 border-r border-gray-200 transition-colors bg-gray-50"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <div className="flex-1 text-center text-sm font-black tabular-nums text-gray-900">
                                            {assignmentQty}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAssignmentQty(Math.min(selectedItem?.quantity, assignmentQty + 1))}
                                            className="p-3 text-gray-400 hover:text-gray-900 border-l border-gray-200 transition-colors bg-gray-50"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Job Note */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Job Note (Optional)</label>
                                    <textarea
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                        rows="2"
                                        placeholder="Add repair details or notes..."
                                        value={assignmentNote}
                                        onChange={(e) => setAssignmentNote(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !selectedJob || selectedItem?.quantity === 0}
                                    className="flex-1 px-4 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-slate-800 disabled:opacity-50 shadow-md transition-all active:scale-[0.98]"
                                >
                                    {isSubmitting ? 'Syncing...' : 'Log Parts Usage'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusPill = ({ quantity, threshold }) => {
    if (quantity === 0) {
        return <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-red-100 text-red-700 border border-red-200">
            <div className="w-1 h-1 rounded-full bg-red-500"></div>
            <span>Out of Stock</span>
        </span>;
    }
    if (quantity <= threshold) {
        return <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-yellow-100 text-yellow-700 border border-yellow-200">
            <div className="w-1 h-1 rounded-full bg-yellow-500"></div>
            <span>Low Stock</span>
        </span>;
    }
    return <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-green-100 text-green-700 border border-green-200">
        <div className="w-1 h-1 rounded-full bg-green-500"></div>
        <span>In Stock</span>
    </span>;
};

export default Inventory;
