import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Truck, Plus, Mail, Phone, Globe, Trash2, Edit3, X, MapPin } from 'lucide-react';
import TableSkeleton from '../components/skeletons/TableSkeleton';

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);

    const [formData, setFormData] = useState({
        name: '', contactName: '', phone: '', email: '', website: '', address: '', notes: ''
    });

    const fetchSuppliers = async () => {
        try {
            const { data } = await api.get('/suppliers');
            setSuppliers(data);
        } catch (error) {
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier._id}`, formData);
                toast.success('Supplier updated');
            } else {
                await api.post('/suppliers', formData);
                toast.success('Supplier added');
            }
            setShowModal(false);
            setEditingSupplier(null);
            setFormData({ name: '', contactName: '', phone: '', email: '', website: '', address: '', notes: '' });
            fetchSuppliers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            contactName: supplier.contactName || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            website: supplier.website || '',
            address: supplier.address || '',
            notes: supplier.notes || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this supplier?')) return;
        try {
            await api.delete(`/suppliers/${id}`);
            toast.success('Supplier deleted');
            fetchSuppliers();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    if (loading) return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2"></div>
                </div>
                <div className="h-10 w-32 bg-blue-100 rounded animate-pulse"></div>
            </div>
            <TableSkeleton rows={6} columns={5} />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Suppliers</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage your procurement network</p>
                </div>
                <button
                    onClick={() => { setShowModal(true); setEditingSupplier(null); }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                    <Plus size={18} />
                    <span>New Supplier</span>
                </button>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {suppliers.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white border border-gray-200 rounded-lg italic text-sm">
                        No supplier records found
                    </div>
                ) : suppliers.map((s) => (
                    <div key={s._id} className="bg-white rounded-lg border border-gray-200 p-5 group hover:border-blue-300 transition-colors relative">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2.5 bg-gray-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                <Truck size={20} />
                            </div>
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-gray-100 rounded-md transition-all">
                                    <Edit3 size={14} />
                                </button>
                                <button onClick={() => handleDelete(s._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-gray-100 rounded-md transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{s.name}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4 truncate">{s.contactName || 'Primary Representative'}</p>

                        <div className="space-y-2 pt-4 border-t border-gray-50 text-xs text-gray-600 font-medium">
                            {s.phone && (
                                <div className="flex items-center">
                                    <Phone size={12} className="mr-3 text-blue-400" /> {s.phone}
                                </div>
                            )}
                            {s.email && (
                                <div className="flex items-center">
                                    <Mail size={12} className="mr-3 text-blue-400" /> {s.email}
                                </div>
                            )}
                            {s.address && (
                                <div className="flex items-center">
                                    <MapPin size={12} className="mr-3 text-blue-400" />
                                    <span className="truncate">{s.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
                        <div className="p-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest">{editingSupplier ? 'Modify Supplier' : 'Register Supplier'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 bg-white p-1 rounded-md border border-gray-200">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Company Name</label>
                                <input
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Person</label>
                                    <input
                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                                    <input
                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                                <input
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Office Address</label>
                                <input
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 text-xs rounded-lg mt-2 hover:bg-blue-700 transition-colors uppercase tracking-widest shadow-lg shadow-blue-200">
                                {editingSupplier ? 'Commit Changes' : 'Register Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
