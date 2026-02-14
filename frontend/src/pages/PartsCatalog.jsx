import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { Plus, Search, X, Edit2, Package, Layers, Settings, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import TableSkeleton from '../components/skeletons/TableSkeleton';

const PartsCatalog = () => {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Apple');
    const [selectedCategory, setSelectedCategory] = useState('Screen');
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPartId, setCurrentPartId] = useState(null);

    const [formData, setFormData] = useState({
        sku: '', name: '', brand: 'Apple', category: 'Screen', series: '',
        retail_price: '', cost_price: '', unit: 'pcs'
    });

    const fetchParts = async () => {
        try {
            const params = new URLSearchParams({
                keyword: searchTerm,
                brand: selectedBrand,
                category: selectedCategory
            });
            if (selectedSeries) params.append('series', selectedSeries);

            const { data } = await api.get(`/parts?${params}`);
            setParts(data);
        } catch (error) {
            toast.error('Failed to load parts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => { fetchParts(); }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedBrand, selectedCategory, selectedSeries]);

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

    // Aggressive model extraction - prioritized by specificity
    const extractBaseModel = (part) => {
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

    const seriesList = useMemo(() => {
        const baseModels = new Set();
        parts.forEach(part => {
            if (part.brand === selectedBrand && part.category === selectedCategory) {
                const baseModel = extractBaseModel(part);
                if (baseModel) baseModels.add(baseModel);
            }
        });

        return Array.from(baseModels).sort((a, b) => {
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
    }, [parts, selectedBrand, selectedCategory]);

    const filteredParts = useMemo(() => {
        return parts.filter(part => {
            const matchesSearch = part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.sku?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesBrand = part.brand === selectedBrand;
            const matchesCategory = part.category === selectedCategory;
            const baseModelOfItem = extractBaseModel(part);
            const matchesSeries = selectedSeries === 'all' || baseModelOfItem === selectedSeries;
            return matchesSearch && matchesBrand && matchesCategory && matchesSeries;
        });
    }, [parts, searchTerm, selectedBrand, selectedCategory, selectedSeries]);

    const handleOpenCreate = () => {
        setIsEditing(false);
        setCurrentPartId(null);
        setFormData({
            sku: '', name: '', brand: selectedBrand, category: selectedCategory, series: '',
            retail_price: '', cost_price: '', unit: 'pcs'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (part) => {
        setIsEditing(true);
        setCurrentPartId(part._id);
        setFormData({
            sku: part.sku || '',
            name: part.name || '',
            brand: part.brand || 'Apple',
            category: part.category || 'Screen',
            series: part.series || '',
            retail_price: part.retail_price || '',
            cost_price: part.cost_price || '',
            unit: part.unit || 'pcs'
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/parts/${currentPartId}`, formData);
                toast.success('Part updated successfully');
            } else {
                await api.post('/parts', formData);
                toast.success('Part added successfully');
            }
            setShowModal(false);
            fetchParts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    if (loading && parts.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-80 bg-gray-100 rounded animate-pulse mt-2"></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="h-32 bg-white border border-gray-200 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Parts Library</h1>
                    <p className="text-gray-500 text-xs mt-0.5">Manage specifications and retail pricing for all components.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-[13px] shadow-sm transition-all active:scale-95"
                >
                    <Plus size={16} />
                    <span>Add New Part</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="bg-white rounded-lg border border-gray-200 p-1 flex items-center space-x-1 w-fit shadow-sm">
                    <button
                        onClick={() => { setSelectedBrand('Apple'); setSelectedSeries('all'); }}
                        className={`px-4 py-1.5 rounded text-[13px] font-bold transition-all ${selectedBrand === 'Apple' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Apple
                    </button>
                    <button
                        onClick={() => { setSelectedBrand('Samsung'); setSelectedSeries('all'); }}
                        className={`px-4 py-1.5 rounded text-[13px] font-bold transition-all ${selectedBrand === 'Samsung' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Samsung
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                        onClick={() => { setSelectedCategory('Screen'); setSelectedSeries('all'); }}
                        className={`px-4 py-1.5 rounded text-[13px] font-bold transition-all ${selectedCategory === 'Screen' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Screens
                    </button>
                    <button
                        onClick={() => { setSelectedCategory('Battery'); setSelectedSeries('all'); }}
                        className={`px-4 py-1.5 rounded text-[13px] font-bold transition-all ${selectedCategory === 'Battery' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Batteries
                    </button>
                </div>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Series Quick Filter */}
            {seriesList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2">
                    <button
                        onClick={() => setSelectedSeries('all')}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${selectedSeries === 'all' ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        All Models
                    </button>
                    {seriesList.map(baseModel => (
                        <button
                            key={baseModel}
                            onClick={() => setSelectedSeries(baseModel)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${selectedSeries === baseModel ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                        >
                            {baseModel}
                        </button>
                    ))}
                </div>
            )}

            {/* Grouped Grid Layout */}
            {filteredParts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
                    <p className="text-gray-400 text-sm font-medium">No parts found in this category</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {(() => {
                        // Group items by base model
                        const grouped = {};
                        filteredParts.forEach(part => {
                            const baseModel = extractBaseModel(part);
                            if (!grouped[baseModel]) grouped[baseModel] = [];
                            grouped[baseModel].push(part);
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
                            <div key={baseModel} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                {/* Compact Group Header */}
                                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
                                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                                        {selectedBrand} {baseModel} {(!isNaN(parseInt(baseModel))) ? 'Series' : ''}
                                    </h3>
                                </div>

                                {/* Dense Group Items */}
                                <div className="p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                                    {grouped[baseModel].map(part => (
                                        <div key={part._id} className="border border-gray-200 rounded p-2 hover:border-blue-300 transition-colors bg-white relative group">
                                            <div className="flex flex-col h-full">
                                                <div className="mb-1.5">
                                                    <div className="text-[10px] font-bold text-blue-600 uppercase font-mono mb-0.5">{part.sku}</div>
                                                    <div className="text-xs font-bold text-gray-900 leading-tight">
                                                        {getDisplayName(part)}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-medium">
                                                        {part.series}
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-1.5 border-t border-gray-100 flex items-center justify-between">
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">${part.retail_price?.toFixed(2)}</div>
                                                        <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Retail Price</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleOpenEdit(part)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                        title="Edit Specification"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                        <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'Update Part' : 'Add New Part'}</h2>
                                <p className="text-xs text-gray-500 font-medium mt-1">Fill in the specification details below.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Brand</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    >
                                        <option value="Apple">Apple</option>
                                        <option value="Samsung">Samsung</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="Screen">Screen</option>
                                        <option value="Battery">Battery</option>
                                        <option value="Charging Port">Charging Port</option>
                                        <option value="Camera">Camera</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">SKU</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono font-bold"
                                        placeholder="SCR-APL-15PM"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Series</label>
                                    <input
                                        type="text"
                                        placeholder="iPhone 15 Pro Max"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                                        value={formData.series}
                                        onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Part Name</label>
                                <input
                                    type="text"
                                    placeholder="OLED Screen Assembly"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cost Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono font-bold"
                                        value={formData.cost_price}
                                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Retail Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono font-bold text-blue-600"
                                        value={formData.retail_price}
                                        onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl mt-4 hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-100 active:scale-95"
                            >
                                {isEditing ? 'Save Changes' : 'Register Part'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartsCatalog;
