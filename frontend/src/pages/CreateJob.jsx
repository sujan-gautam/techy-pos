import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Search, Plus, X, CheckCircle2, ChevronDown } from 'lucide-react';

const CreateJob = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [searchingParts, setSearchingParts] = useState(false);
    const [compatibleParts, setCompatibleParts] = useState([]);
    const [selectedParts, setSelectedParts] = useState([]);

    // Device model dropdown
    const [deviceModels, setDeviceModels] = useState([]);
    const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
    const [deviceSearch, setDeviceSearch] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        deviceModel: '',
        customerName: '',
        customerPhone: '',
        repairPrice: '',
        priority: 'normal',
        repairTypes: [],
        description: ''
    });

    // Repair type presets
    const repairTypePresets = [
        'Screen', 'Battery', 'Charging Port', 'Camera', 'Water Damage', 'Software'
    ];

    // Fetch unique device models from inventory with stock info
    useEffect(() => {
        const fetchDeviceModels = async () => {
            try {
                const [partsRes, inventoryRes] = await Promise.all([
                    api.get('/parts'),
                    api.get('/inventory')
                ]);

                const parts = partsRes.data;
                const inventory = inventoryRes.data;

                // Group parts by device model and calculate total stock
                const modelMap = {};

                parts.forEach(part => {
                    // Extract model from part name
                    const modelName = part.name.replace(/(Screen|Battery|Charging Port|Camera|Back Glass)/gi, '').trim();
                    if (modelName.length > 0) {
                        if (!modelMap[modelName]) {
                            modelMap[modelName] = { name: modelName, totalStock: 0, partCount: 0 };
                        }

                        // Find inventory for this part
                        const inv = inventory.find(i => i.partId?._id === part._id || i.partId === part._id);
                        if (inv) {
                            modelMap[modelName].totalStock += inv.quantity || 0;
                            modelMap[modelName].partCount += 1;
                        }
                    }
                });

                // Convert to array and sort
                const modelsArray = Object.values(modelMap).sort((a, b) => a.name.localeCompare(b.name));
                setDeviceModels(modelsArray);
            } catch (error) {
                console.error('Failed to fetch device models');
            }
        };
        fetchDeviceModels();
    }, []);

    // Search for compatible parts when device model is selected
    useEffect(() => {
        const searchParts = async () => {
            if (formData.deviceModel && formData.deviceModel.length >= 3) {
                setSearchingParts(true);
                try {
                    const { data } = await api.get(`/jobs/compatible-parts?device_model=${formData.deviceModel}`);
                    setCompatibleParts(data);

                    // Auto-add first compatible part with qty=1 if available and not already selected
                    if (data.length > 0 && selectedParts.length === 0) {
                        const firstPart = data[0];
                        if (firstPart.stock.available > 0) {
                            setSelectedParts([{ ...firstPart, qty: 1 }]);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch compatible parts');
                } finally {
                    setSearchingParts(false);
                }
            } else {
                setCompatibleParts([]);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            searchParts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [formData.deviceModel]);

    const handleDeviceSelect = (model) => {
        const modelName = typeof model === 'string' ? model : model.name;
        setFormData({ ...formData, deviceModel: modelName });
        setDeviceSearch(modelName);
        setShowDeviceDropdown(false);
    };

    const filteredDeviceModels = deviceModels.filter(model =>
        model.name.toLowerCase().includes(deviceSearch.toLowerCase())
    );

    const handleRepairTypeToggle = (type) => {
        setFormData(prev => ({
            ...prev,
            repairTypes: prev.repairTypes.includes(type)
                ? prev.repairTypes.filter(t => t !== type)
                : [...prev.repairTypes, type]
        }));
    };

    const handleAddPart = (part) => {
        if (!selectedParts.find(p => p._id === part._id)) {
            setSelectedParts([...selectedParts, { ...part, qty: 1 }]);
            toast.success(`${part.name} added`);
        }
    };

    const handleRemovePart = (partId) => {
        setSelectedParts(selectedParts.filter(p => p._id !== partId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const jobData = {
                customer: {
                    name: formData.customerName || 'Walk-in Customer',
                    phone: formData.customerPhone
                },
                device_model: formData.deviceModel,
                fault_description: formData.description,
                repairTypes: formData.repairTypes,
                repairPrice: parseFloat(formData.repairPrice) || 0,
                priority: formData.priority,
                partsToReserve: selectedParts.map(p => ({
                    partId: p._id,
                    qty: p.qty
                }))
            };

            const { data } = await api.post('/jobs', jobData);
            toast.success('Job created successfully!');
            navigate(`/jobs/${data._id}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-4">
                <h1 className="text-xl font-semibold text-gray-900">Create Repair Job</h1>
                <p className="text-gray-500 text-sm">Quick job creation with auto inventory</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Main Form - Compact Grid */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Device Model - Searchable Dropdown */}
                        <div className="md:col-span-2 relative">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Device Model *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search or type custom model..."
                                    className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    value={deviceSearch}
                                    onChange={(e) => {
                                        setDeviceSearch(e.target.value);
                                        setFormData({ ...formData, deviceModel: e.target.value });
                                        setShowDeviceDropdown(true);
                                    }}
                                    onFocus={() => setShowDeviceDropdown(true)}
                                    // Removed onBlur for now to prevent disappearing while clicking
                                    required
                                />
                                <ChevronDown
                                    size={16}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                />
                            </div>

                            {/* Dropdown */}
                            {showDeviceDropdown && filteredDeviceModels.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {filteredDeviceModels.map((model, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onMouseDown={() => handleDeviceSelect(model)} // Use onMouseDown to trigger before blur
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between group"
                                        >
                                            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{model.name}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${model.totalStock > 10 ? 'bg-green-50 text-green-700 border-green-100' :
                                                model.totalStock > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                    'bg-red-50 text-red-700 border-red-100'
                                                }`}>
                                                {model.totalStock > 0 ? `${model.totalStock} in stock` : 'Out of stock'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
                            <input
                                type="text"
                                placeholder="Optional"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={formData.customerName}
                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                placeholder="Optional"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={formData.customerPhone}
                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                value={formData.repairPrice}
                                onChange={(e) => setFormData({ ...formData, repairPrice: e.target.value })}
                            />
                        </div>

                        {/* Repair Types - Compact */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-2">Repair Type</label>
                            <div className="flex flex-wrap gap-2">
                                {repairTypePresets.map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleRepairTypeToggle(type)}
                                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${formData.repairTypes.includes(type)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Issue Description {formData.repairTypes.length === 0 && '*'}
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                rows="2"
                                placeholder="Describe the issue... (optional if repair type selected)"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required={formData.repairTypes.length === 0}
                            />
                        </div>
                    </div>
                </div>

                {/* Parts Section - Compact */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Parts (Auto-Reserved)</h3>

                    {/* Selected Parts */}
                    {selectedParts.length > 0 && (
                        <div className="mb-3 space-y-2">
                            {selectedParts.map(part => (
                                <div key={part._id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-gray-900 truncate">{part.name}</p>
                                            <p className="text-xs text-gray-500">${part.retail_price?.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newQty = Math.max(1, part.qty - 1);
                                                setSelectedParts(selectedParts.map(p =>
                                                    p._id === part._id ? { ...p, qty: newQty } : p
                                                ));
                                            }}
                                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-600"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={part.qty}
                                            onChange={(e) => {
                                                const qty = Math.max(1, parseInt(e.target.value) || 1);
                                                setSelectedParts(selectedParts.map(p =>
                                                    p._id === part._id ? { ...p, qty } : p
                                                ));
                                            }}
                                            className="w-10 px-1 py-1 border border-gray-200 rounded text-xs text-center"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newQty = part.qty + 1;
                                                setSelectedParts(selectedParts.map(p =>
                                                    p._id === part._id ? { ...p, qty: newQty } : p
                                                ));
                                            }}
                                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-600"
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePart(part._id)}
                                            className="text-red-600 hover:text-red-700 ml-1"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Compatible Parts - Compact Grid */}
                    {searchingParts && (
                        <div className="text-center py-4">
                            <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    {!searchingParts && compatibleParts.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {compatibleParts.map(part => (
                                <button
                                    key={part._id}
                                    type="button"
                                    onClick={() => handleAddPart(part)}
                                    disabled={selectedParts.find(p => p._id === part._id) || part.stock.available === 0}
                                    className={`text-left p-2 border rounded transition-colors ${selectedParts.find(p => p._id === part._id)
                                        ? 'border-green-200 bg-green-50 cursor-not-allowed'
                                        : part.stock.available > 0
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                            : 'border-red-200 bg-red-50 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{part.name}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs font-semibold text-blue-600">${part.retail_price?.toFixed(2)}</span>
                                        <span className={`text-xs ${part.stock.available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {part.stock.available > 0 ? `${part.stock.available}` : 'Out'}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {!searchingParts && formData.deviceModel && compatibleParts.length === 0 && (
                        <p className="text-center py-4 text-gray-500 text-xs">No compatible parts found</p>
                    )}
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => navigate('/jobs')}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {loading ? 'Creating...' : 'Create Job'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateJob;
