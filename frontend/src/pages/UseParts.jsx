import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
    Wrench, User, Smartphone, Package, CheckCircle2,
    Search, AlertCircle, Plus, X, ChevronRight, History, Settings2, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

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
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
                                <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-6 shadow-sm animate-in fade-in zoom-in duration-200 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <button onClick={() => setSelectedPart(null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="flex items-center space-x-5">
                                        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-100">
                                            <Package size={28} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100">Component Selection</span>
                                            <h4 className="text-lg font-bold text-gray-900 mt-1">{selectedPart.partId?.name}</h4>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">SKU: {selectedPart.partId?.sku}</span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Available: {selectedPart.quantity}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleUsePart} className="pt-2 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Usage Quantity</label>
                                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(prev => Math.max(selectedPart.quantity > 0 ? 1 : 0, Number(prev) - 1))}
                                                        disabled={qty <= (selectedPart.quantity > 0 ? 1 : 0)}
                                                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:scale-100"
                                                    >-</button>
                                                    <input
                                                        type="number"
                                                        className="flex-1 bg-transparent text-center font-bold text-lg text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        value={qty}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (isNaN(val)) setQty('');
                                                            else setQty(Math.min(selectedPart.quantity, Math.max(selectedPart.quantity > 0 ? 1 : 0, val)));
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(prev => Math.min(selectedPart.quantity, Number(prev) + 1))}
                                                        disabled={qty >= selectedPart.quantity}
                                                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:scale-100"
                                                    >+</button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Job Note (Optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Add repair details..."
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                                                    value={note}
                                                    onChange={(e) => setNote(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading || selectedPart.quantity < qty || qty < 1}
                                            className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                                                    <span>Log Parts Usage</span>
                                                </>
                                            )}
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
