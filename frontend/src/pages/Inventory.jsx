import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import {
    Package, Edit3, Search, AlertTriangle, X, ChevronRight,
    Filter, Wrench, CheckCircle2, FileText, Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import * as dateFns from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import clsx from 'clsx';

const Inventory = () => {
    const { user } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Apple');
    const [selectedCategory, setSelectedCategory] = useState('Screen');
    const [selectedSeries, setSelectedSeries] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [qtyChange, setQtyChange] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [showUseModal, setShowUseModal] = useState(false);
    const [activeJobs, setActiveJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState('');
    const [useQty, setUseQty] = useState(1);
    const [useNote, setUseNote] = useState('');
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportThreshold, setReportThreshold] = useState(5);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    const canAdjust = user?.role === 'admin' || user?.role === 'manager';

    const fetchInventory = async () => {
        try {
            const { data } = await api.get('/inventory');
            setInventory(data);
        } catch (error) {
            toast.error('Inventory data retrieval failed');
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveJobs = async () => {
        try {
            const { data } = await api.get('/jobs?status=in_progress');
            const { data: diagnosing } = await api.get('/jobs?status=diagnosing');
            const { data: pending } = await api.get('/jobs?status=pending');
            const allJobs = [...data.jobs, ...diagnosing.jobs, ...pending.jobs];
            setActiveJobs(allJobs);
        } catch (error) {
            console.error('Job fetch error', error);
        }
    };

    useEffect(() => { fetchInventory(); }, []);

    const filteredItems = useMemo(() => {
        return inventory.filter(item => {
            const p = item.partId;
            if (!p) return false;

            if (showLowStockOnly) {
                if (item.quantity > (p.reorder_threshold || 5)) return false;
            } else {
                if (p.brand !== selectedBrand) return false;
                if (p.category !== selectedCategory) return false;
                if (selectedSeries && p.series !== selectedSeries) return false;
            }

            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                return p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search);
            }
            return true;
        }).sort((a, b) => (a.partId?.name || '').localeCompare(b.partId?.name || ''));
    }, [inventory, selectedBrand, selectedCategory, searchTerm, selectedSeries, showLowStockOnly]);

    const seriesList = useMemo(() => {
        const series = new Set();
        inventory.forEach(item => {
            if (item.partId?.brand === selectedBrand && item.partId?.category === selectedCategory) {
                if (item.partId?.series) series.add(item.partId.series);
            }
        });
        return Array.from(series).sort();
    }, [inventory, selectedBrand, selectedCategory]);

    const handleSubmitAdjustment = async (e) => {
        e.preventDefault();
        if (!selectedItem) return;
        setSubmitting(true);
        try {
            await api.patch(`/inventory/${selectedItem._id}/adjust`, {
                qtyChange: Number(qtyChange),
                type: 'manual_adjustment'
            });
            toast.success('Stock level adjusted');
            setShowModal(false);
            fetchInventory();
        } catch (error) {
            toast.error('Adjustment failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUseInJob = async (e) => {
        e.preventDefault();
        if (!selectedJob || !selectedItem) return;
        setSubmitting(true);
        try {
            await api.post(`/jobs/${selectedJob}/parts/use`, {
                partId: selectedItem.partId._id,
                qty: Number(useQty),
                note: useNote
            });
            toast.success('Part assigned to repair job');
            setShowUseModal(false);
            setSelectedItem(null);
            setSelectedJob('');
            setUseQty(1);
            setUseNote('');
            fetchInventory();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Part assignment failed');
        } finally {
            setSubmitting(false);
        }
    };

    const generatePDF = () => {
        const lowStockItems = inventory.filter(item => item.quantity <= reportThreshold);
        if (lowStockItems.length === 0) {
            toast.info('No low stock items found');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text('Inventory Low Stock Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        const tableData = lowStockItems.map(item => [
            item.partId?.sku || 'N/A',
            item.partId?.name || 'Unknown',
            item.partId?.brand || 'N/A',
            item.quantity,
            item.partId?.reorder_threshold || '5'
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['SKU', 'Part Name', 'Brand', 'Current Qty', 'Threshold']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] }
        });

        const datestamp = (dateFns && dateFns.format)
            ? dateFns.format(new Date(), 'yyyyMMdd')
            : new Date().toISOString().split('T')[0].replace(/-/g, '');
        doc.save(`inventory_report_${datestamp}.pdf`);
    };

    const generateExcel = () => {
        const lowStockItems = inventory.filter(item => item.quantity <= reportThreshold);
        if (lowStockItems.length === 0) return;

        const data = lowStockItems.map(item => ({
            'SKU': item.partId?.sku,
            'Part Name': item.partId?.name,
            'Brand': item.partId?.brand,
            'Category': item.partId?.category,
            'Quantity': item.quantity,
            'Reorder Threshold': item.partId?.reorder_threshold
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock');
        XLSX.writeFile(wb, 'low_stock_report.xlsx');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage technical parts and spare material stocks.</p>
                </div>
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                    {canAdjust && (
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider transition-colors"
                        >
                            <FileText size={14} className="text-slate-500" />
                            <span>Low Stock Report</span>
                        </button>
                    )}
                    <div className="h-9 px-3 bg-slate-50 border border-slate-200 flex items-center rounded-md text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Total SKU Counts: {inventory.length}
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-md">
                    <TabBtn active={selectedBrand === 'Apple'} onClick={() => { setSelectedBrand('Apple'); setSelectedSeries(null); }} label="Apple" />
                    <TabBtn active={selectedBrand === 'Samsung'} onClick={() => { setSelectedBrand('Samsung'); setSelectedSeries(null); }} label="Samsung" />
                </div>
                <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                <div className="flex bg-slate-100 p-1 rounded-md">
                    <TabBtn active={selectedCategory === 'Screen'} onClick={() => { setSelectedCategory('Screen'); setSelectedSeries(null); }} label="Screens" />
                    <TabBtn active={selectedCategory === 'Battery'} onClick={() => { setSelectedCategory('Battery'); setSelectedSeries(null); }} label="Batteries" />
                </div>
                <button
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    className={clsx(
                        "ml-auto px-4 h-9 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all flex items-center space-x-2 border",
                        showLowStockOnly ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                >
                    <AlertTriangle size={14} />
                    <span>View Low Stock Only</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Series Navigation */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                <Filter size={12} className="mr-2" /> Model Categories
                            </h3>
                        </div>
                        <div className="p-2 space-y-0.5">
                            <SeriesBtn
                                active={selectedSeries === null}
                                onClick={() => setSelectedSeries(null)}
                                label="Full Inventory"
                            />
                            {seriesList.map(series => (
                                <SeriesBtn
                                    key={series}
                                    active={selectedSeries === series}
                                    onClick={() => setSelectedSeries(series)}
                                    label={series}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find items by SKU or part name..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg h-10 text-sm focus:outline-none focus:border-slate-400 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        {filteredItems.length === 0 ? (
                            <div className="py-20 text-center">
                                <Package size={32} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest border border-slate-100 inline-block px-4 py-2 rounded">No records found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-x divide-y divide-slate-100 bg-slate-100">
                                {filteredItems.map(item => (
                                    <div key={item._id} className="bg-white p-5 flex flex-col justify-between hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border border-slate-200">
                                                    {item.partId?.sku}
                                                </span>
                                                {item.quantity <= (item.partId?.reorder_threshold || 5) && (
                                                    <AlertTriangle size={14} className="text-amber-500" />
                                                )}
                                            </div>
                                            <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 min-h-[2.5rem] leading-tight mb-1">
                                                {item.partId?.name}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.partId?.series}</p>
                                        </div>

                                        <div className="mt-8 flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 border-b border-slate-100 w-fit">In Stock</p>
                                                <div className="flex items-center space-x-1.5">
                                                    <span className={clsx(
                                                        "text-xl font-bold tabular-nums",
                                                        item.quantity === 0 ? "text-red-500" :
                                                            item.quantity <= 5 ? "text-amber-500" : "text-slate-900"
                                                    )}>
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter self-end mb-1">Items</span>
                                                </div>
                                            </div>

                                            <div className="flex space-x-1.5">
                                                <button
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setUseQty(1);
                                                        fetchActiveJobs();
                                                        setShowUseModal(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-slate-900 border border-slate-200 rounded hover:bg-white transition-all shadow-sm"
                                                    title="Assign to Job"
                                                >
                                                    <Wrench size={14} />
                                                </button>
                                                {canAdjust && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setQtyChange(0);
                                                            setShowModal(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-slate-900 border border-slate-200 rounded hover:bg-white transition-all shadow-sm"
                                                        title="Inventory Adjustment"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Simple Adjustment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inventory Adjustment</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-900">{selectedItem?.partId?.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100 px-2 py-0.5 rounded w-fit">{selectedItem?.partId?.sku}</p>
                            </div>

                            <form onSubmit={handleSubmitAdjustment} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 border border-slate-100 rounded p-3">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available</label>
                                        <p className="text-lg font-bold text-slate-900">{selectedItem?.quantity}</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 rounded p-3">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Adjustment</label>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent border-none p-0 text-lg font-bold text-slate-900 focus:ring-0"
                                            value={qtyChange}
                                            onChange={(e) => setQtyChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || qtyChange == 0}
                                        className="flex-1 px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                    >
                                        {submitting ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {showUseModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assign Part to Job</h2>
                            <button onClick={() => setShowUseModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-900">{selectedItem?.partId?.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-slate-400">Available Stock: {selectedItem?.quantity}</p>
                            </div>

                            <form onSubmit={handleUseInJob} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job Selection</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-medium focus:outline-none focus:border-slate-400"
                                        value={selectedJob}
                                        onChange={(e) => setSelectedJob(e.target.value)}
                                        required
                                    >
                                        <option value="">Select an active repair job</option>
                                        {activeJobs.map(job => (
                                            <option key={job._id} value={job._id}>
                                                {job.jobId} - {job.device_model} ({job.customer?.name})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-1 space-y-1.5">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedItem?.quantity}
                                            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-center font-bold outline-none"
                                            value={useQty}
                                            onChange={(e) => setUseQty(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technician Note</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm outline-none"
                                            placeholder="Optional note"
                                            value={useNote}
                                            onChange={(e) => setUseNote(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowUseModal(false)}
                                        className="flex-1 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !selectedJob || selectedItem?.quantity === 0}
                                        className="flex-1 px-4 py-2 bg-slate-900 font-bold text-white text-xs uppercase tracking-widest rounded hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                                    >
                                        <CheckCircle2 size={14} />
                                        <span>Submit to Job</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Low Stock Filter Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowReportModal(false)}></div>
                    <div className="relative bg-white rounded-lg w-full max-w-sm border border-slate-200 shadow-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Report Configuration</h2>
                            <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Stock Threshold</label>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="number"
                                            min="0"
                                            max="1000"
                                            value={reportThreshold}
                                            onChange={(e) => setReportThreshold(Number(e.target.value))}
                                            className="w-24 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                                        />
                                        <span className="text-xs font-medium text-slate-400">Units or less</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Select Export Format</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={generatePDF}
                                            className="flex items-center justify-center space-x-3 p-3 border border-slate-200 rounded hover:bg-slate-50 transition-all text-slate-700"
                                        >
                                            <FileText size={16} className="text-slate-400" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider">PDF Document</span>
                                        </button>
                                        <button
                                            onClick={generateExcel}
                                            className="flex items-center justify-center space-x-3 p-3 border border-slate-200 rounded hover:bg-slate-50 transition-all text-slate-700"
                                        >
                                            <Download size={16} className="text-slate-400" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider">Excel Sheet</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-[10px] text-slate-400 text-center leading-relaxed font-medium">
                                    This report will include all inventory items with a current balance of {reportThreshold} {reportThreshold === 1 ? 'unit' : 'units'} or less.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={clsx(
            "px-6 py-1.5 text-xs font-semibold rounded transition-all",
            active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
        )}
    >
        {label}
    </button>
);

const SeriesBtn = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={clsx(
            "w-full text-left px-3 py-2 text-xs font-medium rounded transition-all flex items-center justify-between",
            active ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        )}
    >
        <span>{label}</span>
        {active && <ChevronRight size={10} />}
    </button>
);

export default Inventory;
