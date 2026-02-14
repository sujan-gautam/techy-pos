import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import { Plus, Search, Edit, Wrench, Download, X, Minus } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const Inventory = () => {
    const { user } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Apple');
    const [selectedCategory, setSelectedCategory] = useState('Screen');
    const [selectedSeries, setSelectedSeries] = useState('all');
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [adjustmentQty, setAdjustmentQty] = useState(0);
    const [assignmentQty, setAssignmentQty] = useState(1);
    const [assignmentNote, setAssignmentNote] = useState('');
    const [selectedJob, setSelectedJob] = useState('');
    const [activeJobs, setActiveJobs] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canManageStock = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';

    // Aggressive cleaning to keep only Model + Category (Screen/Battery)
    const getDisplayName = (part) => {
        if (!part) return '';
        let name = part.name || '';
        const category = part.category === 'Screen' ? 'Screen' : part.category === 'Battery' ? 'Battery' : part.category || '';

        // 1. Remove all typical marketing/junk terms
        const junkTerms = [
            /High-Quality/gi, /Screen Assembly/gi, /Super AMOLED/gi, /Service Pack/gi,
            /LCD Display Assembly/gi, /Display Assembly/gi, /Premium/gi, /Genuine/gi,
            /Replacement/gi, /Part/gi, /Module/gi, /Assembly/gi, /Full/gi, /Original/gi
        ];
        junkTerms.forEach(term => { name = name.replace(term, ''); });

        // 2. Remove the category name from the string temporarily to clean the model name
        if (category) {
            const catRegex = new RegExp(category, 'gi');
            name = name.replace(catRegex, '');
        }

        // 3. Clean up whitespace
        name = name.replace(/\s+/g, ' ').trim();

        // 4. Return clean Model + Category
        return category ? `${name} ${category}` : name;
    };

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

    useEffect(() => {
        setSelectedSeries('all');
    }, [selectedBrand, selectedCategory]);

    // Aggressive model extraction - prioritized by specificity
    const extractBaseModel = (item) => {
        const part = item?.partId;
        if (!part) return 'Other';

        const brand = part.brand || '';
        const series = part.series || '';
        const name = part.name || '';
        const s = `${series} ${name}`;

        if (brand === 'Apple') {
            // 1. Numbered models (17, 16, 15... down to 6)
            const numMatch = s.match(/\b(1[1-7]|[6-9])\b/i) || s.match(/(1[1-7]|[6-9])/);
            if (numMatch) return numMatch[1];

            // 2. Handle X series strictly
            if (/\bX[RS]?\b/i.test(s)) {
                const xMatch = s.match(/\bX[RS]?\b/i);
                return xMatch[0].toUpperCase();
            }

            // 3. Handle SE strictly
            if (/\bSE\b/i.test(s)) return 'SE';
        }

        if (brand === 'Samsung') {
            // Group by Galaxy S, A, Note, Z + Number
            const samsungMatch = s.match(/\b([SAZ]|Note)\s*(\d+)/i);
            if (samsungMatch) {
                return `${samsungMatch[1].toUpperCase()}${samsungMatch[2]}`;
            }
            // Fallback for variants where number isn't easily extracted
            const simpleSeries = series.match(/([SAZ]|Note) Series/i);
            if (simpleSeries) return simpleSeries[1].toUpperCase();
        }

        return series || 'Other';
    };

    const seriesList = useMemo(() => {
        const baseModels = new Set();
        inventory.forEach(item => {
            if (item.partId?.brand === selectedBrand && item.partId?.category === selectedCategory) {
                const baseModel = extractBaseModel(item);
                if (baseModel) baseModels.add(baseModel);
            }
        });
        return Array.from(baseModels).sort((a, b) => {
            const getRank = (val) => {
                if (val === 'SE') return -1;
                // Samsung Separation (Z > S > Note > A)
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
    }, [inventory, selectedBrand, selectedCategory]);

    const filteredInventory = useMemo(() => {
        const filtered = inventory.filter(item => {
            const part = item.partId;
            if (!part) return false;
            const matchesSearch = part.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesBrand = part.brand === selectedBrand;
            const matchesCategory = part.category === selectedCategory;

            const baseModelOfItem = extractBaseModel(item);
            const matchesSeries = selectedSeries === 'all' || baseModelOfItem === selectedSeries;

            return matchesSearch && matchesBrand && matchesCategory && matchesSeries;
        });

        // Smart Merging for Redundant Parts (e.g., iPhone 12 and 12 Pro screens are same)
        const merged = [];
        const combined12Item = {
            _id: null,
            quantity: 0,
            partId: null,
            isMerged: true
        };

        const itemsToRemove = new Set();

        filtered.forEach(item => {
            const name = item.partId?.name || '';
            const is12 = name.includes('iPhone 12') && !name.includes('12 Pro') && !name.includes('Mini') && !name.includes('Max');
            const is12Pro = name.includes('iPhone 12 Pro') && !name.includes('Max');
            const is12Combo = name.includes('12 / 12 Pro');

            if (is12 || is12Pro || is12Combo) {
                combined12Item.quantity += item.quantity;
                // Prefer the combo part for the display data
                if (is12Combo || (!combined12Item.partId)) {
                    combined12Item.partId = item.partId;
                    combined12Item._id = item._id; // Use this ID for adjustments
                }
                itemsToRemove.add(item._id);
            }
        });

        if (combined12Item.partId) {
            merged.push(combined12Item);
        }

        return [...filtered.filter(item => !itemsToRemove.has(item._id)), ...merged];
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
        return <div className="flex items-center justify-center h-96"><div className="text-gray-500">Loading...</div></div>;
    }

    return (
        <div className="space-y-3">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1.5">
                        <Download size={14} />
                        Export
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5">
                        <Plus size={14} />
                        Add Part
                    </button>
                </div>
            </div>

            {/* Compact Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded">
                        {['Apple', 'Samsung'].map(brand => (
                            <button
                                key={brand}
                                onClick={() => setSelectedBrand(brand)}
                                className={clsx("px-2.5 py-1 text-xs font-medium rounded", selectedBrand === brand ? "bg-white shadow" : "text-gray-600")}
                            >
                                {brand}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded">
                        {['Screen', 'Battery'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={clsx("px-2.5 py-1 text-xs font-medium rounded", selectedCategory === cat ? "bg-white shadow" : "text-gray-600")}
                            >
                                {cat}s
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                {seriesList.length > 0 && (
                    <div className="flex gap-1.5 mt-2 overflow-x-auto">
                        <button
                            onClick={() => setSelectedSeries('all')}
                            className={clsx("px-2.5 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap", selectedSeries === 'all' ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600")}
                        >
                            All
                        </button>
                        {seriesList.map(series => (
                            <button
                                key={series}
                                onClick={() => setSelectedSeries(series)}
                                className={clsx("px-2.5 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap", selectedSeries === series ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600")}
                            >
                                {series}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grouped Grid Layout */}
            {filteredInventory.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
                    <p className="text-gray-400 text-sm">No items found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {(() => {
                        // Group items by base model
                        const grouped = {};
                        filteredInventory.forEach(item => {
                            const baseModel = extractBaseModel(item);
                            if (!grouped[baseModel]) {
                                grouped[baseModel] = [];
                            }
                            grouped[baseModel].push(item);
                        });

                        // Sort groups using the same logic as the filter chips
                        const sortedGroups = Object.keys(grouped).sort((a, b) => {
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

                        return sortedGroups.map(baseModel => (
                            <div key={baseModel} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                {/* Compact Group Header */}
                                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
                                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                                        {selectedBrand} {baseModel} {(!isNaN(parseInt(baseModel))) ? 'Series' : ''}
                                    </h3>
                                </div>

                                {/* Dense Group Items */}
                                <div className="p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                                    {grouped[baseModel].map(item => (
                                        <div key={item._id} className="border border-gray-200 rounded p-2 hover:border-blue-300 transition-colors bg-white">
                                            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold text-gray-900 leading-tight">
                                                        {getDisplayName(item.partId)}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">
                                                        {item.partId?.series}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {item.quantity === 0 ? (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-700">OUT</span>
                                                    ) : item.quantity <= (item.partId?.reorder_threshold || 5) ? (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-700">LOW</span>
                                                    ) : (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-100 text-green-700">OK</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                                <div className={clsx("text-xl font-bold leading-none", item.quantity === 0 ? "text-red-600" : item.quantity <= (item.partId?.reorder_threshold || 5) ? "text-amber-600" : "text-gray-900")}>
                                                    {item.quantity}
                                                </div>
                                                <div className="flex gap-0.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setAssignmentQty(1);
                                                            setAssignmentNote('');
                                                            fetchJobs();
                                                            setShowAssignModal(true);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Assign"
                                                    >
                                                        <Wrench size={14} />
                                                    </button>
                                                    {canManageStock && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setAdjustmentQty(0);
                                                                setShowAdjustModal(true);
                                                            }}
                                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                                                            title="Adjust"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}

            {/* Adjust Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Adjust Stock</h3>
                            <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAdjust} className="p-4 space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-900">{getDisplayName(selectedItem?.partId)}</p>
                                <p className="text-xs text-gray-500">{selectedItem?.partId?.series}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Current</label>
                                    <div className="px-3 py-2 bg-gray-50 border rounded text-sm font-semibold">{selectedItem?.quantity}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Change (+/-)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={adjustmentQty}
                                        onChange={(e) => setAdjustmentQty(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 rounded flex justify-between items-center">
                                <span className="text-xs font-medium text-blue-900">New Total</span>
                                <span className="text-lg font-bold text-blue-900">{Number(selectedItem?.quantity) + Number(adjustmentQty)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={isSubmitting || Number(adjustmentQty) === 0} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Assign to Job</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAssign} className="p-4 space-y-4">
                            <div>
                                <p className="text-sm font-medium text-gray-900">{getDisplayName(selectedItem?.partId)}</p>
                                <p className="text-xs text-gray-500">Available: {selectedItem?.quantity}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Job</label>
                                <select
                                    className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedJob}
                                    onChange={(e) => setSelectedJob(e.target.value)}
                                    required
                                >
                                    <option value="">Select job...</option>
                                    {activeJobs.map(job => (
                                        <option key={job._id} value={job._id}>#{job.jobId} - {job.device_model} ({job.customer?.name})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                <div className="flex items-center border rounded overflow-hidden">
                                    <button type="button" onClick={() => setAssignmentQty(Math.max(1, assignmentQty - 1))} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-r">
                                        <Minus size={16} />
                                    </button>
                                    <div className="flex-1 text-center py-2 font-semibold">{assignmentQty}</div>
                                    <button type="button" onClick={() => setAssignmentQty(Math.min(selectedItem?.quantity, assignmentQty + 1))} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-l">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows="2"
                                    placeholder="Optional note..."
                                    value={assignmentNote}
                                    onChange={(e) => setAssignmentNote(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedJob || selectedItem?.quantity === 0}
                                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Assigning...' : 'Assign'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
