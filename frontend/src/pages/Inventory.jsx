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

    const canAdjust = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';

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
                type: 'manual_adjustment',
                note: `Manual stock adjustment by ${user?.name} (${user?.role})`
            });
            toast.success('Stock level updated successfully');
            setShowModal(false);
            fetchInventory();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Adjustment failed');
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
                    <div className="flex items-center space-x-2 mb-1">
                        <Package size={20} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Material Logistics</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Inventory <span className="text-slate-400 font-light">Stock</span></h1>
                </div>
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                    {user?.role !== 'technician' && (
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-sm hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95"
                        >
                            <FileText size={14} className="text-slate-400" />
                            <span>Audit Report</span>
                        </button>
                    )}
                    <div className="h-9 px-4 bg-slate-900 flex items-center rounded-sm text-[10px] font-bold text-white uppercase tracking-widest border border-slate-900 shadow-lg shadow-slate-200">
                        SKUs: {inventory.length}
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-slate-100 p-0.5 rounded-sm border border-slate-200">
                    <TabBtn active={selectedBrand === 'Apple'} onClick={() => { setSelectedBrand('Apple'); setSelectedSeries(null); }} label="Apple" />
                    <TabBtn active={selectedBrand === 'Samsung'} onClick={() => { setSelectedBrand('Samsung'); setSelectedSeries(null); }} label="Samsung" />
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-sm border border-slate-200">
                    <TabBtn active={selectedCategory === 'Screen'} onClick={() => { setSelectedCategory('Screen'); setSelectedSeries(null); }} label="Screens" />
                    <TabBtn active={selectedCategory === 'Battery'} onClick={() => { setSelectedCategory('Battery'); setSelectedSeries(null); }} label="Batteries" />
                </div>
                <button
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    className={clsx(
                        "ml-auto px-4 h-9 rounded-sm text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center space-x-2 border",
                        showLowStockOnly ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100" : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900"
                    )}
                >
                    <AlertTriangle size={14} />
                    <span>Low Stock Only</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Series Navigation */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <Filter size={12} className="mr-2" /> Model Matrix
                            </h3>
                        </div>
                        <div className="p-1.5 space-y-0.5">
                            <SeriesBtn
                                active={selectedSeries === null}
                                onClick={() => setSelectedSeries(null)}
                                label="View All Models"
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
                <div className="lg:col-span-3 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="FILTER BY SKU OR COMPONENT NAME..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-sm h-11 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-slate-400 focus:bg-slate-50/50 transition-all placeholder:text-slate-300 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                        {filteredItems.length === 0 ? (
                            <div className="py-24 text-center">
                                <Package size={40} className="text-slate-100 mx-auto mb-4" strokeWidth={1} />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] bg-slate-50 inline-block px-6 py-2 rounded-full border border-slate-100">No Inventory Records</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-slate-100">
                                {filteredItems.map(item => (
                                    <div key={item._id} className="bg-white p-6 flex flex-col justify-between hover:bg-slate-50/50 transition-all group">
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <span className="bg-slate-900 text-white px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-[0.1em] border border-slate-900 shadow-md shadow-slate-100">
                                                    {item.partId?.sku}
                                                </span>
                                                {item.quantity <= (item.partId?.reorder_threshold || 5) && (
                                                    <div className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
                                                        <AlertTriangle size={12} className="text-red-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-900 line-clamp-2 min-h-[3rem] leading-relaxed mb-1 uppercase tracking-tight">
                                                {item.partId?.name}
                                            </h4>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.partId?.series}</p>
                                        </div>

                                        <div className="mt-8 flex items-end justify-between">
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] mb-2 opacity-60">Stock Balance</p>
                                                <div className="flex items-center space-x-2">
                                                    <span className={clsx(
                                                        "text-2xl font-black tabular-nums tracking-tighter",
                                                        item.quantity === 0 ? "text-red-600" :
                                                            item.quantity <= 5 ? "text-amber-600" : "text-slate-900"
                                                    )}>
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest self-end mb-1">Units</span>
                                                </div>
                                            </div>

                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setUseQty(1);
                                                        fetchActiveJobs();
                                                        setShowUseModal(true);
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-blue-600 border border-slate-200 rounded-sm hover:bg-white transition-all shadow-sm active:scale-90"
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
                                                        className="p-2.5 text-slate-400 hover:text-slate-900 border border-slate-200 rounded-sm hover:bg-white transition-all shadow-sm active:scale-90"
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-sm shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-full max-w-sm border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-900 flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center">
                                <Edit3 size={14} className="mr-3 text-slate-400" /> Stock Adjustment
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div>
                                <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight mb-2">{selectedItem?.partId?.name}</h4>
                                <div className="flex items-center space-x-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-100">{selectedItem?.partId?.sku}</span>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedItem?.partId?.series}</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitAdjustment} className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-slate-50/50 border border-slate-100 rounded-sm p-4 relative overflow-hidden group">
                                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Available Balance</label>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{selectedItem?.quantity}</p>
                                        <div className="absolute right-0 bottom-0 opacity-5 -mb-2 -mr-2 text-slate-900 transform rotate-12">
                                            <Package size={64} />
                                        </div>
                                    </div>
                                    <div className="bg-white border-2 border-slate-900 rounded-sm p-4 shadow-[4px_4px_0_0_rgba(15,23,42,0.1)]">
                                        <label className="block text-[8px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2">Stock Delta</label>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent border-none p-0 text-2xl font-black text-slate-900 focus:ring-0 tabular-nums tracking-tighter outline-none"
                                            value={qtyChange}
                                            onChange={(e) => setQtyChange(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 text-[9px] font-bold py-3 px-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-sm uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                                    New Projected Stock: {Number(selectedItem?.quantity) + Number(qtyChange)}
                                </div>

                                <div className="flex space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-all border border-transparent"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || qtyChange == 0}
                                        className="flex-[1.5] px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 disabled:opacity-20 transition-all shadow-xl shadow-slate-200 active:scale-95"
                                    >
                                        {submitting ? 'COMMITTING...' : 'COMMIT CHANGES'}
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
            )
            }

            {/* Low Stock Filter Modal */}
            {
                showReportModal && (
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
                )
            }
        </div >
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
