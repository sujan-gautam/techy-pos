import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
    Wrench, User, Smartphone, Package, CheckCircle2,
    Search, AlertCircle, Plus, X, ChevronRight, History, Settings2, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import ListSkeleton from '../components/skeletons/ListSkeleton';

const UseParts = () => {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchingInitial, setFetchingInitial] = useState(true);
    const [users, setUsers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [inventory, setInventory] = useState([]);

    // Selection State
    const [selectedTech, setSelectedTech] = useState(currentUser?._id || '');
    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Apple');
    const [selectedCategory, setSelectedCategory] = useState('Screen');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPart, setSelectedPart] = useState(null);
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState('');

    const fetchInitialData = async () => {
        try {
            setFetchingInitial(true);
            const [usersRes, jobsRes, invRes] = await Promise.all([
                api.get('/users'),
                api.get('/jobs?status=in_progress'),
                api.get('/inventory')
            ]);

            // Fetch diagnosing and pending as well
            const diagnosingRes = await api.get('/jobs?status=diagnosing');
            const pendingRes = await api.get('/jobs?status=pending');

            setUsers(usersRes.data);
            setJobs([...jobsRes.data.jobs, ...diagnosingRes.data.jobs, ...pendingRes.data.jobs]);
            setInventory(invRes.data);

            // Set tech if not set
            if (!selectedTech && currentUser?._id) setSelectedTech(currentUser._id);

        } catch (error) {
            toast.error('Failed to load portal data');
        } finally {
            setFetchingInitial(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedPart) {
            setQty(selectedPart.quantity > 0 ? 1 : 0);
        }
    }, [selectedPart]);

    // Aggressive cleaning to keep only Model + Category (Screen/Battery)
    const getDisplayName = (part) => {
        if (!part) return '';
        let name = part.name || '';
        const category = part.category === 'Screen' ? 'Screen' : part.category === 'Battery' ? 'Battery' : part.category || '';
        const junkTerms = [
            /High-Quality/gi, /Screen Assembly/gi, /Super AMOLED/gi, /Service Pack/gi,
            /LCD Display Assembly/gi, /Display Assembly/gi, /Premium/gi, /Genuine/gi,
            /Replacement/gi, /Part/gi, /Module/gi, /Assembly/gi, /Full/gi, /Original/gi
        ];
        junkTerms.forEach(term => { name = name.replace(term, ''); });
        if (category) {
            const catRegex = new RegExp(category, 'gi');
            name = name.replace(catRegex, '');
        }
        name = name.replace(/\s+/g, ' ').trim();
        return category ? `${name} ${category}` : name;
    };

    // Aggressive model extraction
    const extractBaseModel = (item) => {
        const part = item?.partId;
        if (!part) return 'Other';
        const brand = part.brand || '';
        const series = part.series || '';
        const name = part.name || '';
        const s = `${series} ${name}`;

        if (brand === 'Apple') {
            const numMatch = s.match(/\b(1[1-7]|[6-9])\b/i) || s.match(/(1[1-7]|[6-9])/);
            if (numMatch) return numMatch[1];
            if (/\bX[RS]?\b/i.test(s)) {
                const xMatch = s.match(/\bX[RS]?\b/i);
                return xMatch[0].toUpperCase();
            }
            if (/\bSE\b/i.test(s)) return 'SE';
        }

        if (brand === 'Samsung') {
            const samsungMatch = s.match(/\b([SAZ]|Note)\s*(\d+)/i);
            if (samsungMatch) return `${samsungMatch[1].toUpperCase()}${samsungMatch[2]}`;
            const simpleSeries = series.match(/([SAZ]|Note) Series/i);
            if (simpleSeries) return simpleSeries[1].toUpperCase();
        }

        return series || 'Other';
    };

    const filteredInventory = useMemo(() => {
        const filtered = inventory.filter(item => {
            const matchesBrand = item.partId?.brand === selectedBrand;
            const matchesCategory = item.partId?.category === selectedCategory;

            if (!searchTerm) return matchesBrand && matchesCategory;

            const lower = searchTerm.toLowerCase();
            const matchesSearch = item.partId?.name?.toLowerCase().includes(lower) ||
                item.partId?.sku?.toLowerCase().includes(lower) ||
                item.partId?.series?.toLowerCase().includes(lower);

            return matchesBrand && matchesCategory && matchesSearch;
        });

        // Group by base model for UI
        const grouped = {};
        filtered.forEach(item => {
            const baseModel = extractBaseModel(item);
            if (!grouped[baseModel]) grouped[baseModel] = [];
            grouped[baseModel].push(item);
        });

        return grouped;
    }, [searchTerm, inventory, selectedBrand, selectedCategory]);

    const sortedGroupKeys = useMemo(() => {
        return Object.keys(filteredInventory).sort((a, b) => {
            const getRank = (val) => {
                if (val === 'SE') return -1;
                if (val.startsWith('Z')) return 4000 + (parseInt(val.substring(1)) || 0);
                if (val.startsWith('S')) return 3000 + (parseInt(val.substring(1)) || 0);
                if (val.startsWith('Note')) return 2000 + (parseInt(val.substring(4)) || 0);
                if (val.startsWith('A')) return 1000 + (parseInt(val.substring(1)) || 0);
                if (val === 'X' || val === 'XR' || val === 'XS') return 10;
                const num = parseInt(val);
                return isNaN(num) ? -100 : num;
            };
            return getRank(b) - getRank(a);
        });
    }, [filteredInventory]);

    const filteredTechs = useMemo(() => {
        return users.filter(u => u.role === 'technician' || u.role === 'admin' || u.role === 'manager');
    }, [users]);

    const handleUsePart = async (e) => {
        e.preventDefault();
        if (!selectedPart || !selectedTech) {
            toast.error('Please select both a technician and a part');
            return;
        }

        setLoading(true);
        try {
            if (selectedJobId) {
                // Assign to specific job
                await api.post(`/jobs/${selectedJobId}/parts/use`, {
                    partId: selectedPart.partId._id,
                    qty: Number(qty),
                    note: note,
                    techId: selectedTech
                });
                toast.success('Material logged to repair job');
            } else {
                // General usage (no job)
                await api.post(`/inventory/use`, {
                    partId: selectedPart.partId._id,
                    qty: Number(qty),
                    note: note,
                    techId: selectedTech
                });
                toast.success('General stock usage logged');
            }

            // Reset fields
            setSearchTerm('');
            setSelectedPart(null);
            setQty(1);
            setNote('');

            // Refresh stock
            const { data } = await api.get('/inventory');
            setInventory(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Logging failed');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingInitial) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="h-64 bg-white border border-gray-200 rounded-xl animate-pulse"></div>
                    <div className="lg:col-span-2 h-96 bg-white border border-gray-200 rounded-xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">Use Parts Portal</h1>
                    <p className="text-gray-500 text-xs mt-0.5">Quickly log parts consumption for active repair jobs</p>
                </div>
                <Link to="/usage-logs" className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white text-gray-600 rounded-lg hover:bg-gray-50 border border-gray-200 transition-all text-xs font-bold">
                    <History size={14} />
                    <span>Usage History</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Column - Assignment Context */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center space-x-2">
                            <Settings2 size={14} className="text-gray-400" />
                            <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-tight">Assignment</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Technician</label>
                                <div className="relative">
                                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        value={selectedTech}
                                        onChange={(e) => setSelectedTech(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Tech...</option>
                                        {filteredTechs.map(u => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                    <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none rotate-90" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Repair Job (Link)</label>
                                <div className="relative">
                                    <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        value={selectedJobId}
                                        onChange={(e) => setSelectedJobId(e.target.value)}
                                    >
                                        <option value="">General Shop Use</option>
                                        {jobs.map(job => (
                                            <option key={job._id} value={job._id}>
                                                #{job.jobId} - {job.device_model}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start space-x-2 shadow-sm">
                        <Info size={16} className="text-blue-600 mt-0.5" />
                        <div className="text-[10px] text-blue-800 font-bold leading-relaxed">
                            Log usage immediately after consumption to maintain accurate stock levels.
                        </div>
                    </div>

                    {selectedPart && (
                        <div className="bg-white border border-blue-500 rounded-xl p-4 shadow-lg ring-4 ring-blue-50">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="text-[10px] font-bold text-blue-600 uppercase font-mono">{selectedPart.partId?.sku}</div>
                                    <h3 className="text-sm font-bold text-gray-900 leading-tight mt-0.5">{getDisplayName(selectedPart.partId)}</h3>
                                    <p className="text-[10px] text-gray-500 font-medium mt-1">Available: {selectedPart.quantity} units</p>
                                </div>
                                <button onClick={() => setSelectedPart(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleUsePart} className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Log Qty</label>
                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                                        <button
                                            type="button"
                                            onClick={() => setQty(prev => Math.max(1, Number(prev) - 1))}
                                            className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 font-bold"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            className="w-full text-center text-sm font-bold text-gray-900 border-x border-gray-200 focus:outline-none py-1.5"
                                            value={qty}
                                            readOnly
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setQty(prev => Math.min(selectedPart.quantity, Number(prev) + 1))}
                                            className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Notes</label>
                                    <input
                                        type="text"
                                        placeholder="Optional usage note..."
                                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || selectedPart.quantity < qty}
                                    className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? 'Logging...' : 'Record Usage'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Right Column - Catalog Search */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="bg-white rounded-lg border border-gray-200 p-1 flex items-center space-x-1 w-fit shadow-sm">
                            <button
                                onClick={() => setSelectedBrand('Apple')}
                                className={clsx(
                                    "px-4 py-1.5 rounded text-[11px] font-bold transition-all",
                                    selectedBrand === 'Apple' ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                Apple
                            </button>
                            <button
                                onClick={() => setSelectedBrand('Samsung')}
                                className={clsx(
                                    "px-4 py-1.5 rounded text-[11px] font-bold transition-all",
                                    selectedBrand === 'Samsung' ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                Samsung
                            </button>
                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                            <button
                                onClick={() => setSelectedCategory('Screen')}
                                className={clsx(
                                    "px-4 py-1.5 rounded text-[11px] font-bold transition-all",
                                    selectedCategory === 'Screen' ? "bg-blue-50 text-blue-700 border border-blue-100" : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                Screens
                            </button>
                            <button
                                onClick={() => setSelectedCategory('Battery')}
                                className={clsx(
                                    "px-4 py-1.5 rounded text-[11px] font-bold transition-all",
                                    selectedCategory === 'Battery' ? "bg-blue-50 text-blue-700 border border-blue-100" : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                Batteries
                            </button>
                        </div>

                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Scan SKU or search by model name..."
                                className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-1 custom-scrollbar">
                        {sortedGroupKeys.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl p-20 text-center">
                                <Package size={40} className="mx-auto text-gray-200 mb-2" />
                                <p className="text-gray-400 text-sm font-semibold uppercase tracking-widest">No stock found</p>
                            </div>
                        ) : sortedGroupKeys.map(baseModel => (
                            <div key={baseModel} className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                                <div className="bg-gray-50 px-3 py-1 border-b border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{baseModel} Series</span>
                                </div>
                                <div className="p-1.5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1.5">
                                    {filteredInventory[baseModel].map(item => (
                                        <button
                                            key={item._id}
                                            onClick={() => {
                                                setSelectedPart(item);
                                                setSearchTerm('');
                                            }}
                                            className={clsx(
                                                "p-2 rounded-lg border text-left transition-all group relative",
                                                selectedPart?._id === item._id
                                                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-50"
                                                    : "border-gray-100 hover:border-blue-300 hover:bg-gray-50 active:scale-[0.98]"
                                            )}
                                        >
                                            <div className="mb-1">
                                                <div className="text-[9px] font-bold text-gray-400 uppercase font-mono">{item.partId?.sku}</div>
                                                <div className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2">
                                                    {getDisplayName(item.partId)}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-auto">
                                                <div className={clsx(
                                                    "text-xs font-bold",
                                                    item.quantity === 0 ? "text-red-600" : item.quantity <= 5 ? "text-amber-600" : "text-emerald-600"
                                                )}>
                                                    Qty: {item.quantity}
                                                </div>
                                                <div className="bg-gray-200 h-1 w-8 rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            "h-full rounded-full",
                                                            item.quantity === 0 ? "bg-red-500" : item.quantity <= 5 ? "bg-amber-500" : "bg-emerald-500"
                                                        )}
                                                        style={{ width: `${Math.min(100, (item.quantity / 20) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UseParts;
