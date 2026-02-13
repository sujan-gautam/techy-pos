import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import { Package, Edit3, Search, AlertTriangle, X, ChevronRight, Filter, Info, Wrench, CheckCircle2, FileText, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
    const [reportLoading, setReportLoading] = useState(false);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    const canAdjust = user?.role === 'admin' || user?.role === 'manager';

    const fetchInventory = async () => {
        try {
            const { data } = await api.get('/inventory');
            setInventory(data);
        } catch (error) {
            toast.error('Failed to load inventory');
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
            console.error('Failed to fetch jobs', error);
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
            toast.success('Part allocated to job');
            setShowUseModal(false);
            setSelectedItem(null);
            setSelectedJob('');
            setUseQty(1);
            setUseNote('');
            fetchInventory();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Usage failed');
        } finally {
            setSubmitting(false);
        }
    };

    const generatePDF = () => {
        const lowStockItems = inventory.filter(item => item.quantity <= reportThreshold);
        if (lowStockItems.length === 0) {
            toast.info('No items found with stock below ' + reportThreshold);
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Low Stock Inventory Report', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Threshold: Less than or equal to ${reportThreshold}`, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);

        const tableData = lowStockItems.map(item => [
            item.partId?.sku || 'N/A',
            item.partId?.name || 'Unknown',
            item.partId?.brand || 'N/A',
            item.partId?.category || 'N/A',
            item.quantity,
            item.partId?.reorder_threshold || 'N/A'
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['SKU', 'Part Name', 'Brand', 'Category', 'Qty', 'Threshold']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save(`low-stock-report-${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('PDF Report Generated');
    };

    const generateExcel = () => {
        const lowStockItems = inventory.filter(item => item.quantity <= reportThreshold);
        if (lowStockItems.length === 0) {
            toast.info('No items found with stock below ' + reportThreshold);
            return;
        }

        const data = lowStockItems.map(item => ({
            'SKU': item.partId?.sku || 'N/A',
            'Part Name': item.partId?.name || 'Unknown',
            'Brand': item.partId?.brand || 'N/A',
            'Category': item.partId?.category || 'N/A',
            'Quantity': item.quantity,
            'Reorder Threshold': item.partId?.reorder_threshold || 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Low Stock');
        XLSX.writeFile(wb, `low-stock-report-${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Excel Report Generated');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Control and track your material stock levels.</p>
                </div>
                <div className="flex items-center space-x-4">
                    {canAdjust && (
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm shadow-sm transition-all active:scale-95"
                        >
                            <FileText size={18} className="text-blue-600" />
                            <span>Low Stock Report</span>
                        </button>
                    )}
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                        <Package size={14} className="text-blue-600" />
                        <span>Total SKUs: {inventory.length}</span>
                    </div>
                </div>
            </div>

            {/* Top Navigation / Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-1.5 flex items-center space-x-2 w-fit shadow-sm">
                <button
                    onClick={() => { setSelectedBrand('Apple'); setSelectedSeries(null); }}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${selectedBrand === 'Apple' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Apple Tech
                </button>
                <button
                    onClick={() => { setSelectedBrand('Samsung'); setSelectedSeries(null); }}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${selectedBrand === 'Samsung' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Samsung Galaxy
                </button>
                <div className="w-px h-5 bg-gray-200 mx-2"></div>
                <button
                    onClick={() => { setSelectedCategory('Screen'); setSelectedSeries(null); }}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${selectedCategory === 'Screen' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Screens
                </button>
                <button
                    onClick={() => { setSelectedCategory('Battery'); setSelectedSeries(null); }}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${selectedCategory === 'Battery' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Batteries
                </button>
                <div className="w-px h-5 bg-gray-200 mx-2"></div>
                <button
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 ${showLowStockOnly ? 'bg-red-600 text-white shadow-md' : 'text-red-500 hover:bg-red-50'}`}
                >
                    <AlertTriangle size={16} />
                    <span>Low Stock Only</span>
                </button>
            </div>

            <div className="flex gap-6">
                {/* Series Sidebar */}
                <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-fit">
                    <div className="flex items-center space-x-2 mb-4 px-2">
                        <Filter size={14} className="text-gray-400" />
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Model Series</h3>
                    </div>
                    <div className="space-y-1">
                        <button
                            onClick={() => setSelectedSeries(null)}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${selectedSeries === null ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            <span>Baseline Catalog</span>
                            {selectedSeries === null && <ChevronRight size={14} />}
                        </button>
                        {seriesList.map(series => (
                            <button
                                key={series}
                                onClick={() => setSelectedSeries(series)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${selectedSeries === series ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                            >
                                <span>{series}</span>
                                {selectedSeries === series && <ChevronRight size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Interrogate stock levels by part name or SKU..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {filteredItems.length === 0 ? (
                            <div className="p-20 text-center">
                                <Package size={40} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-sm font-medium text-gray-400 italic">No inventory records for this selection.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                                {filteredItems.map(item => (
                                    <div
                                        key={item._id}
                                        className="bg-white p-5 hover:bg-gray-50/80 transition-all flex flex-col justify-between group"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-tighter shadow-sm font-mono">
                                                    {item.partId?.sku}
                                                </span>
                                                {item.quantity <= 5 && (
                                                    <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
                                                )}
                                            </div>
                                            <h4 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                                                {item.partId?.name}
                                            </h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.partId?.series}</p>
                                        </div>

                                        <div className="mt-6 flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Stock Level</p>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-2xl font-black font-mono leading-none ${item.quantity === 0 ? 'text-red-600' :
                                                        item.quantity <= 5 ? 'text-amber-600' :
                                                            'text-emerald-600'
                                                        }`}>
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 self-end mb-0.5">UNITS</span>
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
                                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-100 transition-all shadow-sm"
                                                    title="Use in Job"
                                                >
                                                    <Wrench size={16} />
                                                </button>
                                                {canAdjust && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setQtyChange(0);
                                                            setShowModal(true);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all shadow-sm group/btn"
                                                        title="Adjust Stock"
                                                    >
                                                        <Edit3 size={16} className="group-hover/btn:scale-110 transition-transform" />
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

            {/* Adjustment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Inventory Adjustment</h2>
                                <p className="text-xs text-gray-500 font-medium mt-1">Manual stock correction log</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <div className="text-xs font-bold text-blue-600 mb-1">COMPONENT SELECTED</div>
                                <h4 className="text-sm font-bold text-gray-900">{selectedItem?.partId?.name}</h4>
                                <p className="text-xs font-mono text-gray-500 mt-1 uppercase">{selectedItem?.partId?.sku}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">CURRENT STOCK</span>
                                    <span className="text-2xl font-black text-gray-900 font-mono">{selectedItem?.quantity}</span>
                                </div>
                                <div className="bg-blue-50/30 rounded-xl p-4 border border-blue-100">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">PROJETED STOCK</span>
                                    <span className="text-2xl font-black text-blue-600 font-mono">
                                        {selectedItem?.quantity + Number(qtyChange)}
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitAdjustment} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Adjustment Delta (+/-)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-4 border border-gray-200 rounded-xl text-3xl font-black text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-gray-50/50"
                                        value={qtyChange}
                                        onChange={(e) => setQtyChange(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                    <p className="text-[10px] text-gray-400 text-center mt-3 font-medium italic">Use negative values to decrement stock (e.g. -5)</p>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-all"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || qtyChange === 0}
                                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-lg shadow-blue-100 transition-all active:scale-95"
                                    >
                                        {submitting ? 'Committing...' : 'Commit Change'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Use in Job Modal */}
            {showUseModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                        <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Direct Material Allocation</h2>
                                <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-tight">Quick assignment to active repair</p>
                            </div>
                            <button onClick={() => setShowUseModal(false)} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-900">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                <div className="text-[10px] font-bold text-emerald-600 mb-1 uppercase tracking-widest">Selected Item</div>
                                <h4 className="text-sm font-bold text-gray-900">{selectedItem?.partId?.name}</h4>
                                <p className="text-xs font-mono text-gray-500 mt-1 uppercase">SKU: {selectedItem?.partId?.sku} | Stock: {selectedItem?.quantity}</p>
                            </div>

                            <form onSubmit={handleUseInJob} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Select Active Job *</label>
                                    <select
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                        value={selectedJob}
                                        onChange={(e) => setSelectedJob(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose a repair job...</option>
                                        {activeJobs.map(job => (
                                            <option key={job._id} value={job._id}>
                                                {job.jobId} - {job.device_model} ({job.customer?.name})
                                            </option>
                                        ))}
                                    </select>
                                    {activeJobs.length === 0 && (
                                        <p className="text-[10px] text-red-500 font-bold mt-2 uppercase">No active jobs found to allocate parts to.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedItem?.quantity}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            value={useQty}
                                            onChange={(e) => setUseQty(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Reference Note</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="Optional note..."
                                            value={useNote}
                                            onChange={(e) => setUseNote(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowUseModal(false)}
                                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !selectedJob || selectedItem?.quantity === 0}
                                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-bold text-sm shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center space-x-2"
                                    >
                                        {submitting ? 'Processing...' : (
                                            <>
                                                <CheckCircle2 size={16} />
                                                <span>Allocate to Build</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Low Stock Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}></div>
                    <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-blue-600 px-6 py-6 text-white relative">
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="absolute right-4 top-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center space-x-3">
                                <FileText size={24} />
                                <div>
                                    <h3 className="text-xl font-bold">Low Stock Audit</h3>
                                    <p className="text-blue-100 text-xs mt-1">Export critical inventory levels</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="mb-8">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex justify-between">
                                    <span>Stock Threshold Filter</span>
                                    <span className="text-blue-600">Items ≤ {reportThreshold}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    step="1"
                                    value={reportThreshold}
                                    onChange={(e) => setReportThreshold(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
                                />
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                                    <span>Out of Stock (0)</span>
                                    <span>Batch Limit (50)</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={generatePDF}
                                    className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:bg-red-50 hover:border-red-100 transition-all group"
                                >
                                    <div className="p-3 bg-red-100 rounded-full text-red-600 mb-3 group-hover:scale-110 transition-transform">
                                        <FileText size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-700">Export PDF</span>
                                </button>
                                <button
                                    onClick={generateExcel}
                                    className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-100 transition-all group"
                                >
                                    <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                                        <Download size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-700">Export Excel</span>
                                </button>
                            </div>

                            <p className="mt-8 text-center text-[10px] text-gray-400 italic">
                                This report filters all active inventory series where current quantity is less than or equal to {reportThreshold}.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
