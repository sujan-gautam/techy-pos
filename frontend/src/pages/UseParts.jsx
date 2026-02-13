import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
    Wrench, User, Smartphone, Package, CheckCircle2,
    Search, AlertCircle, Plus, X, ChevronRight, History, Settings2, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
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

    const filteredInventory = useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return inventory.filter(item =>
            item.partId?.name?.toLowerCase().includes(lower) ||
            item.partId?.sku?.toLowerCase().includes(lower) ||
            item.partId?.series?.toLowerCase().includes(lower)
        ).slice(0, 8);
    }, [searchTerm, inventory]);

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
                        <div className="h-4 w-80 bg-gray-100 rounded animate-pulse mt-2"></div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div className="h-64 bg-white border border-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="col-span-2">
                        <ListSkeleton items={5} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Use Parts Portal</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Quickly log parts consumption for active repair jobs</p>
                </div>
                <Link to="/usage-logs" className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 border border-gray-200 transition-all text-sm font-medium">
                    <History size={16} />
                    <span>View Usage History</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Context */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center space-x-2">
                            <Settings2 size={16} className="text-gray-400" />
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight">Assignment</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Technician</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-10 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        value={selectedTech}
                                        onChange={(e) => setSelectedTech(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose technician...</option>
                                        {filteredTechs.map(u => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                    <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none rotate-90" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Repair Job (Optional)</label>
                                <div className="relative">
                                    <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-10 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        value={selectedJobId}
                                        onChange={(e) => setSelectedJobId(e.target.value)}
                                    >
                                        <option value="">General Shop Stock</option>
                                        {jobs.map(job => (
                                            <option key={job._id} value={job._id}>
                                                #{job.jobId} - {job.device_model}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 flex items-start space-x-3 shadow-sm">
                        <Info size={20} className="text-amber-600 mt-0.5" />
                        <div className="text-xs text-amber-800 font-medium leading-relaxed">
                            Submitting this form immediately adjusts inventory and updates the customer's invoice. Please verify SKU before final log.
                        </div>
                    </div>
                </div>

                {/* Right Column - Part Search & Usage */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px] flex flex-col">
                        <div className="p-6 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by SKU or part name..."
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm font-medium transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 p-6 space-y-3 overflow-y-auto max-h-[450px]">
                            {searchTerm && filteredInventory.length === 0 && (
                                <div className="text-center py-12">
                                    <Package size={40} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-sm font-medium text-gray-400">No components found for this query.</p>
                                </div>
                            )}

                            {!selectedPart && !searchTerm && (
                                <div className="text-center py-24 text-gray-300">
                                    <Wrench size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-sm font-bold uppercase tracking-widest opacity-40">Ready for scan / input</p>
                                </div>
                            )}

                            {filteredInventory.map(item => (
                                <button
                                    key={item._id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedPart(item);
                                        setSearchTerm('');
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/20 transition-all text-left group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-blue-600 font-bold border border-gray-100">
                                            {item.partId?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">{item.partId?.name}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase font-mono mt-0.5">{item.partId?.sku}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-bold ${item.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {item.quantity} in stock
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter">{item.partId?.series}</div>
                                    </div>
                                </button>
                            ))}

                            {selectedPart && (
                                <div className="bg-white border border-gray-300 rounded p-5 space-y-5">
                                    <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900">{selectedPart.partId?.name}</h3>
                                            <div className="mt-1 space-y-0.5">
                                                <p className="text-xs text-gray-500">SKU: {selectedPart.partId?.sku}</p>
                                                <p className="text-xs text-gray-500">Stock available: {selectedPart.quantity} units</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedPart(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleUsePart} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Quantity</label>
                                                <div className="flex items-center border border-gray-300 rounded">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(prev => Math.max(1, Number(prev) - 1))}
                                                        disabled={qty <= 1}
                                                        className="px-3 py-2 border-r border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        className="flex-1 text-center text-sm font-medium text-gray-900 border-0 focus:outline-none focus:ring-0 py-2"
                                                        value={qty}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (!isNaN(val)) setQty(Math.min(selectedPart.quantity, Math.max(1, val)));
                                                        }}
                                                        min="1"
                                                        max={selectedPart.quantity}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(prev => Math.min(selectedPart.quantity, Number(prev) + 1))}
                                                        disabled={qty >= selectedPart.quantity}
                                                        className="px-3 py-2 border-l border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., Screen replacement"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || selectedPart.quantity < qty || qty < 1}
                                            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {loading ? 'Processing...' : 'Record usage'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UseParts;
