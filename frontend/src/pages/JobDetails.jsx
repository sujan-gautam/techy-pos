import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
    ArrowLeft, Smartphone, User, Clock, MessageSquare, Plus, CheckCircle2,
    Package, History, Shield, AlertCircle, Receipt, X, Search, ChevronRight, RotateCcw
} from 'lucide-react';

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [users, setUsers] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPartModal, setShowPartModal] = useState(false);
    const [partSearch, setPartSearch] = useState('');
    const [selectedPart, setSelectedPart] = useState(null);
    const [partQty, setPartQty] = useState(1);
    const [partNote, setPartNote] = useState('');

    const { register, handleSubmit, reset } = useForm();

    const modelStockCount = useMemo(() => {
        if (!job?.device_model || inventory.length === 0) return null;
        const modelLower = job.device_model.toLowerCase();
        return inventory
            .filter(item =>
                item.partId?.name.toLowerCase().includes(modelLower) ||
                (item.partId?.compatible_models && item.partId.compatible_models.toLowerCase().includes(modelLower))
            )
            .reduce((sum, item) => sum + (item.quantity || 0), 0);
    }, [job?.device_model, inventory]);

    const partsTotal = useMemo(() => {
        let total = 0;
        job?.partsUsed?.forEach(p => {
            total += (p.partId?.retail_price || 0) * (p.qty || 0);
        });
        return total;
    }, [job?.partsUsed]);

    const totalEstimate = (job?.totalCost || 0) + partsTotal;

    const fetchJob = async () => {
        try {
            const { data } = await api.get(`/jobs/${id}`);
            setJob(data);
        } catch (error) {
            toast.error('Failed to load job');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/users');
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users');
        }
    };

    const fetchInventory = async () => {
        try {
            const { data } = await api.get('/inventory');
            setInventory(data);
            setFilteredInventory(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchJob();
        fetchUsers();
        fetchInventory();
    }, [id]);

    useEffect(() => {
        if (showPartModal && inventory.length === 0) {
            fetchInventory();
        }
    }, [showPartModal]);

    useEffect(() => {
        if (!partSearch) {
            setFilteredInventory(inventory);
        } else {
            const lowerFilter = partSearch.toLowerCase();
            setFilteredInventory(inventory.filter(item =>
                item.partId?.name.toLowerCase().includes(lowerFilter) ||
                item.partId?.sku.toLowerCase().includes(lowerFilter) ||
                item.partId?.brand?.toLowerCase().includes(lowerFilter)
            ));
        }
    }, [partSearch, inventory]);

    const handleUpdateJob = async (field, value) => {
        try {
            await api.put(`/jobs/${id}`, { [field]: value });
            toast.success('Updated');
            fetchJob();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const handleAddNote = async (data) => {
        if (!data.note.trim()) return;
        try {
            await api.put(`/jobs/${id}`, { note: data.note });
            toast.success('Note added');
            reset();
            fetchJob();
        } catch (error) {
            toast.error('Failed to add note');
        }
    };

    const handleAddPart = async (action) => {
        if (!selectedPart) return;
        try {
            const payload = {
                partId: selectedPart.partId._id,
                qty: Number(partQty),
                note: partNote
            };
            const endpoint = action === 'reserve' ? `/jobs/${id}/parts/reserve` : `/jobs/${id}/parts/use`;
            await api.post(endpoint, payload);
            toast.success(`Part ${action === 'reserve' ? 'Reserved' : 'Used'}`);
            setShowPartModal(false);
            setSelectedPart(null);
            setPartQty(1);
            setPartNote('');
            fetchJob();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const handleMarkAsUsed = async (partId, qty) => {
        try {
            await api.post(`/jobs/${id}/parts/use`, { partId, qty });
            toast.success('Part installed');
            fetchJob();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed');
        }
    };

    const handleReversePart = async (partUsedId) => {
        if (!window.confirm('Are you sure you want to reverse this part usage? The item will be returned to inventory stock.')) return;
        try {
            await api.post(`/jobs/${id}/parts/reverse-use`, { partUsedId });
            toast.success('Usage reversed');
            fetchJob();
            fetchInventory();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Reversal failed');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            completed: 'bg-green-100 text-green-700 border-green-200',
            pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
            cancelled: 'bg-red-100 text-red-700 border-red-200',
            diagnosing: 'bg-purple-100 text-purple-700 border-purple-200',
            waiting_parts: 'bg-orange-100 text-orange-700 border-orange-200'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {status?.replace('_', ' ')}
            </span>
        );
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    if (!job) return <div className="p-20 text-center text-gray-500 font-medium">Job not found</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/jobs')}
                        className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-gray-900">{job.jobId}</h1>
                            {getStatusBadge(job.status)}
                        </div>
                        <p className="text-sm text-gray-500 font-medium mt-1">Created on {new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                        <User size={16} className="text-gray-400 mr-2" />
                        <select
                            value={job.assignedTechId?._id || ''}
                            onChange={(e) => handleUpdateJob('assignedTechId', e.target.value)}
                            className="text-sm font-semibold text-gray-700 bg-transparent focus:outline-none"
                        >
                            <option value="">Unassigned</option>
                            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                        </select>
                    </div>
                    <select
                        value={job.status}
                        onChange={(e) => handleUpdateJob('status', e.target.value)}
                        className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 focus:outline-none"
                    >
                        <option value="pending">Mark Pending</option>
                        <option value="diagnosing">Diagnosing</option>
                        <option value="waiting_parts">Waiting Parts</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Device & Repair Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Diagnostic Summary */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center">
                            <Smartphone size={20} className="text-blue-600 mr-3" />
                            <h3 className="text-lg font-bold text-gray-900">Diagnosis & Unit Info</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Device Model</label>
                                    <div className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                        {job.device_model}
                                        {modelStockCount === 0 && (
                                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold uppercase border border-red-100 rounded-md">
                                                Out of Stock
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {job.repairTypes?.map(type => (
                                            <span key={type} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200">
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-gray-50">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Customer</label>
                                    <div className="text-base font-bold text-gray-900">{job.customer?.name}</div>
                                    <div className="text-sm text-blue-600 font-semibold cursor-pointer hover:underline mt-1">{job.customer?.phone || 'No phone'}</div>
                                </div>
                            </div>
                            <div className="bg-blue-50/20 border border-blue-100 rounded-2xl p-6">
                                <label className="text-xs font-bold text-blue-500 uppercase tracking-widest block mb-3">Fault Description</label>
                                <p className="text-sm text-gray-700 leading-relaxed font-medium italic">
                                    "{job.fault_description || 'No description provided.'}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Material Allocation */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center">
                                <Package size={20} className="text-blue-600 mr-3" />
                                <h3 className="text-lg font-bold text-gray-900">Material Allocation</h3>
                            </div>
                            <button
                                onClick={() => setShowPartModal(true)}
                                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-bold text-xs transition-all active:scale-95"
                            >
                                <Plus size={16} />
                                <span>Allocate Parts</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/30 border-b border-gray-100">
                                        <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Component</th>
                                        <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Qty</th>
                                        <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                        <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {/* Reserved Parts */}
                                    {job.partsRequested?.map((part, idx) => (
                                        <tr key={`res-${idx}`} className="group transition-colors hover:bg-gray-50/50">
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-bold text-gray-900">{part.partId?.name}</div>
                                                <div className="text-xs text-gray-500 font-mono mt-0.5">{part.partId?.sku}</div>
                                            </td>
                                            <td className="px-8 py-5 text-center font-bold text-gray-700">{part.qty}</td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 uppercase tracking-wide">Reserved</span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => handleMarkAsUsed(part.partId._id, part.qty)}
                                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                                                    title="Mark as Installed"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Used Parts */}
                                    {job.partsUsed?.map((part, idx) => (
                                        <tr key={`used-${idx}`} className="bg-emerald-50/10 group transition-colors hover:bg-emerald-50/30">
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-bold text-gray-900 uppercase tracking-tight">{part.partId?.name}</div>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">{part.partId?.sku}</div>
                                            </td>
                                            <td className="px-8 py-5 text-center font-bold text-gray-700">{part.qty}</td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="px-3 py-1 bg-emerald-100/50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200 uppercase tracking-wide">Installed</span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleReversePart(part._id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Reverse usage (return to stock)"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!job.partsUsed?.length && !job.partsRequested?.length) && (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-14 text-center text-gray-400 italic text-sm font-medium">
                                                No parts have been allocated to this job.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Summary & Timeline */}
                <div className="lg:sticky lg:top-6 space-y-8 h-fit">
                    {/* Financial Summary Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center">
                                <Receipt size={18} className="text-blue-600 mr-3" />
                                <h3 className="text-base font-bold text-gray-900">Financial Summary</h3>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-100 px-2 py-1 rounded-md">Estimate</span>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-500">Labor Charge</span>
                                <span className="text-sm font-bold text-gray-900 font-mono">${job.totalCost?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-500">Total Materials</span>
                                <span className="text-sm font-bold text-gray-900 font-mono">${partsTotal.toFixed(2)}</span>
                            </div>
                            <div className="pt-5 border-t border-gray-100 flex justify-between items-end">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Total Quote</span>
                                    <div className="text-2xl font-bold text-blue-600 font-mono tracking-tight">${totalEstimate.toFixed(2)}</div>
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase text-right">Inc. Taxes</div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Feed */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col shadow-sm max-h-[600px]">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center">
                                <MessageSquare size={18} className="text-blue-600 mr-3" />
                                <h3 className="text-base font-bold text-gray-900">Technical Log</h3>
                            </div>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-6 no-scrollbar">
                            {job.notes?.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-10 font-medium">No log entries found. Start documenting your progress.</p>
                            )}
                            {job.notes?.map((note, index) => (
                                <div key={index} className="flex space-x-4">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex-shrink-0 flex items-center justify-center text-xs font-bold text-blue-600 shadow-sm border border-blue-100">
                                        {(note.author?.name || 'S').charAt(0)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-900">{note.author?.name || 'System'}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">
                                                {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-xs text-gray-600 leading-relaxed font-medium">{note.text}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50/30">
                            <form onSubmit={handleSubmit(handleAddNote)} className="relative">
                                <textarea
                                    {...register('note', { required: true })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 min-h-[100px] resize-none shadow-sm"
                                    placeholder="Add technical update..."
                                />
                                <button
                                    type="submit"
                                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                >
                                    <Plus size={18} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Component Allocation Modal */}
            {showPartModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-200">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 text-center uppercase tracking-tight">Material Allocation</h3>
                                <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-widest">Inventory Management System</p>
                            </div>
                            <button onClick={() => setShowPartModal(false)} className="text-gray-400 hover:text-gray-900 bg-white p-2 rounded-xl border border-gray-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {!selectedPart ? (
                            <>
                                <div className="p-8 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Search by SKU, Model, or Component Name..."
                                            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold shadow-sm transition-all"
                                            value={partSearch}
                                            onChange={(e) => setPartSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {filteredInventory.length === 0 && (
                                        <p className="text-center py-20 text-gray-400 font-medium italic">No components found in local inventory.</p>
                                    )}
                                    {filteredInventory.map(item => (
                                        <button
                                            key={item._id}
                                            onClick={() => setSelectedPart(item)}
                                            className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                                        >
                                            <div className="flex flex-col items-start">
                                                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase">{item.partId?.name}</div>
                                                <div className="text-xs font-mono text-gray-400 mt-1">{item.partId?.sku}</div>
                                            </div>
                                            <div className="flex items-center space-x-6">
                                                <div className="text-right">
                                                    <div className={`text-xs font-bold uppercase ${item.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {item.quantity} In Stock
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">${item.partId?.retail_price?.toFixed(2)} UN.</div>
                                                </div>
                                                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-10 space-y-8 overflow-y-auto">
                                <div className="flex items-start justify-between bg-blue-50/30 p-8 rounded-2xl border border-blue-100">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] block mb-2">Component Selection</label>
                                            <h4 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{selectedPart.partId?.name}</h4>
                                            <p className="text-xs font-mono text-gray-500 uppercase mt-1">{selectedPart.partId?.sku}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 pt-2">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Local Stock</p>
                                                <p className="text-lg font-bold text-emerald-600">{selectedPart.quantity} units</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Unit MSRP</p>
                                                <p className="text-lg font-bold text-gray-900">${selectedPart.partId?.retail_price?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedPart(null); setPartQty(1); }}
                                        className="text-gray-400 hover:text-gray-900 bg-white p-2 rounded-xl border border-gray-200"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">Required Quantity</label>
                                            <div className="flex items-center space-x-6">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={selectedPart.quantity}
                                                    className="w-full px-5 py-3 border border-gray-200 rounded-xl text-base font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                    value={partQty}
                                                    onChange={(e) => setPartQty(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-3">Optional Note</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Screen for replacement..."
                                                className="w-full px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                value={partNote}
                                                onChange={(e) => setPartNote(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-6">
                                        <button
                                            onClick={() => handleAddPart('reserve')}
                                            className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                        >
                                            <Clock size={24} className="text-gray-400 group-hover:text-blue-500 mb-3" />
                                            <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700 uppercase tracking-tight">Reserve for Job</span>
                                            <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Waiting for repair</span>
                                        </button>
                                        <button
                                            onClick={() => handleAddPart('use')}
                                            className="flex flex-col items-center justify-center p-6 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all group shadow-sm active:scale-95"
                                        >
                                            <CheckCircle2 size={24} className="text-emerald-600 mb-3" />
                                            <span className="text-sm font-bold text-emerald-700 uppercase tracking-tight">Mark as Installed</span>
                                            <span className="text-[10px] text-emerald-500 mt-1 uppercase font-bold">Affects final bill</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobDetails;
