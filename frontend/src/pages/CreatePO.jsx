import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, Plus, Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';

const CreatePO = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [parts, setParts] = useState([]);
    const [poItems, setPoItems] = useState([]);
    const [selectedPart, setSelectedPart] = useState('');

    useEffect(() => {
        // Fetch parts for dropdown
        const fetchParts = async () => {
            try {
                const { data } = await api.get('/parts');
                setParts(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchParts();
    }, []);

    const addItem = () => {
        if (!selectedPart) return;
        const part = parts.find(p => p._id === selectedPart);

        setPoItems([...poItems, {
            partId: part._id,
            name: part.name,
            sku: part.sku,
            orderedQty: 1,
            costPerUnit: part.cost_price || 0
        }]);
        setSelectedPart('');
    };

    const removeItem = (index) => {
        const newItems = [...poItems];
        newItems.splice(index, 1);
        setPoItems(newItems);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...poItems];
        newItems[index][field] = value;
        setPoItems(newItems);
    };

    const onSubmit = async (data) => {
        if (poItems.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        try {
            await api.post('/pos', {
                supplier: data.supplier,
                expectedDate: data.expectedDate,
                items: poItems.map(item => ({
                    partId: item.partId,
                    orderedQty: Number(item.orderedQty),
                    costPerUnit: Number(item.costPerUnit)
                }))
            });
            toast.success('Purchase Order Created');
            navigate('/pos');
        } catch (error) {
            toast.error('Failed to create PO');
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/pos')} className="mr-4 p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">New Purchase Order</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                        <input
                            {...register('supplier', { required: 'Supplier is required' })}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="e.g. Vendor Corp"
                        />
                        {errors.supplier && <p className="text-red-500 text-xs mt-1">{errors.supplier.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                        <input
                            type="date"
                            {...register('expectedDate')}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Items Section */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Items Ordered</h3>

                    <div className="flex gap-2 mb-4">
                        <select
                            value={selectedPart}
                            onChange={(e) => setSelectedPart(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded"
                        >
                            <option value="">Select Part...</option>
                            {parts.map(part => (
                                <option key={part._id} value={part._id}>{part.sku} - {part.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={addItem}
                            className="bg-indigo-600 text-white px-4 rounded hover:bg-indigo-700"
                        >
                            Add
                        </button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-4 py-2">Part</th>
                                    <th className="px-4 py-2 w-24">Qty</th>
                                    <th className="px-4 py-2 w-32">Cost ($)</th>
                                    <th className="px-4 py-2 w-32">Total ($)</th>
                                    <th className="px-4 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {poItems.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-gray-800">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.sku}</div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.orderedQty}
                                                onChange={(e) => updateItem(index, 'orderedQty', e.target.value)}
                                                className="w-full p-1 border rounded"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.costPerUnit}
                                                onChange={(e) => updateItem(index, 'costPerUnit', e.target.value)}
                                                className="w-full p-1 border rounded"
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-medium">
                                            ${(item.orderedQty * item.costPerUnit).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {poItems.length === 0 && <p className="p-4 text-center text-gray-500">No items added.</p>}
                    </div>

                    {poItems.length > 0 && (
                        <div className="flex justify-end mt-4">
                            <div className="text-right">
                                <span className="text-gray-500 mr-2">Total Estimated Cost:</span>
                                <span className="text-xl font-bold text-gray-900">
                                    ${poItems.reduce((acc, item) => acc + (item.orderedQty * item.costPerUnit), 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition"
                    >
                        <Save size={18} />
                        <span>Create Purchase Order</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePO;
