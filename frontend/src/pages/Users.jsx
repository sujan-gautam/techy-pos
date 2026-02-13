import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { User, Plus, Trash2, Shield, X, Mail, ShieldCheck, Wrench } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', role: 'technician'
    });

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/users');
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', {
                ...newUser,
                storeId: null
            });
            toast.success('User registered successfully');
            setShowModal(false);
            setNewUser({ name: '', email: '', password: '', role: 'technician' });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('User removed');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-purple-50 text-purple-700 border-purple-100',
            manager: 'bg-blue-50 text-blue-700 border-blue-100',
            technician: 'bg-gray-50 text-gray-700 border-gray-200'
        };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[role] || styles.technician}`}>
                {role === 'admin' && <Shield size={10} className="mr-1" />}
                {role}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Staff Management</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Control access and roles across your team</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    <span>Invite Team Member</span>
                </button>
            </div>

            {/* Content List as a Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse font-sans">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Identity</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Access Rights</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Credential (UID)</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 italic-last">
                        {users.map((user) => (
                            <tr key={user._id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            {user.name?.[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                            <div className="flex items-center mt-0.5">
                                                <Mail size={10} className="mr-1.5 text-gray-400" />
                                                <span className="text-[10px] text-gray-500 font-medium">{user.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getRoleBadge(user.role)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{user._id}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDeleteUser(user._id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-gray-100 rounded-md transition-all"
                                        title="Revoke Access"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Registration Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="p-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest">Register Access</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 bg-white p-1 rounded-md border border-gray-200">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Legal Name</label>
                                <input
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Secure Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Permission Level</label>
                                <select
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium appearance-none"
                                    value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="technician">Technician</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 text-xs rounded-lg mt-2 hover:bg-blue-700 transition-colors uppercase tracking-widest shadow-lg shadow-blue-200">
                                Initialize Account
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
