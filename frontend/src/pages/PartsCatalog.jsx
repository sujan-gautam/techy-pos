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

    const seriesList = useMemo(() => {
        const series = new Set();
        parts.forEach(part => {
            if (part.series) series.add(part.series);
        });
        return Array.from(series).sort();
    }, [parts]);

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
                    <div className="h-10 w-32 bg-blue-100 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-6">
                    <div className="w-64 h-96 bg-white border border-gray-200 rounded-lg animate-pulse"></div>
                    <div className="flex-1">
                        <TableSkeleton rows={8} columns={4} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Parts Library</h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Manage specifications and retail pricing for all components.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm shadow-md transition-all active:scale-95"
                >
                    <Plus size={18} />
                    <span>Add New Part</span>
                </button>
            </div>

            {/* Filter Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 p-1.5 flex items-center space-x-2 w-fit shadow-sm">
                <button
                    onClick={() => { setSelectedBrand('Apple'); setSelectedSeries(null); }}
                    className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${selectedBrand === 'Apple' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Apple
                </button>
                <button
                    onClick={() => { setSelectedBrand('Samsung'); setSelectedSeries(null); }}
                    className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${selectedBrand === 'Samsung' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Samsung
                </button>
                <div className="w-px h-5 bg-gray-200 mx-2"></div>
                <button
                    onClick={() => { setSelectedCategory('Screen'); setSelectedSeries(null); }}
                    className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${selectedCategory === 'Screen' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Screens
                </button>
                <button
                    onClick={() => { setSelectedCategory('Battery'); setSelectedSeries(null); }}
                    className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${selectedCategory === 'Battery' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Batteries
                </button>
            </div>

            {/* Main Layout */}
            <div className="flex gap-6">
                {/* Series Sidebar */}
                <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-fit">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Series</h3>
                    <div className="space-y-1">
                        <button
                            onClick={() => setSelectedSeries(null)}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${selectedSeries === null ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            <span>All Models</span>
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

                {/* Content Area */}
                <div className="flex-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search library by name or SKU..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">SKU & Ref</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Specification</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Price</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parts.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-medium">No parts found</td>
                                    </tr>
                                ) : parts.map(part => (
                                    <tr key={part._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                {part.sku}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{part.name}</div>
                                            <div className="flex items-center text-xs text-gray-500 font-medium space-x-2">
                                                <span>{part.brand}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                <span>{part.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right font-mono">
                                            <div className="text-sm font-bold text-gray-900">${part.retail_price?.toFixed(2)}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">Retail</div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={() => handleOpenEdit(part)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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
