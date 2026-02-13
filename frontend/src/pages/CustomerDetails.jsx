import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { ArrowLeft, Smartphone, History, User, MapPin, Mail, Phone } from 'lucide-react';

const CustomerDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchCustomerData = async () => {
        try {
            const { data } = await api.get(`/customers/${id}`);
            setData(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load customer');
            navigate('/customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomerData();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Customer History...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Customer not found</div>;

    const { customer, jobs } = data;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Customer Profile</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto text-3xl font-black mb-4">
                                {customer.name[0]}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                            <p className="text-gray-500 text-sm">Customer since {new Date(customer.createdAt).toLocaleDateString()}</p>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="flex items-center text-gray-700">
                                <Phone size={16} className="mr-3 text-indigo-500" /> {customer.phone}
                            </div>
                            <div className="flex items-center text-gray-700">
                                <Mail size={16} className="mr-3 text-indigo-500" /> {customer.email || 'No email provided'}
                            </div>
                            <div className="flex items-center text-gray-700">
                                <MapPin size={16} className="mr-3 text-indigo-500" /> {customer.address || 'No address saved'}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-2xl font-bold text-indigo-600">{customer.jobCount}</div>
                                    <div className="text-xs text-gray-400 uppercase font-bold">Total Jobs</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-600">${customer.totalSpent?.toFixed(0) || 0}</div>
                                    <div className="text-xs text-gray-400 uppercase font-bold">Revenue</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Job History */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center">
                                <History size={18} className="mr-2 text-indigo-600" /> Repair History
                            </h3>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {jobs.length === 0 && <p className="p-8 text-center text-gray-500 italic">No job history found.</p>}
                            {jobs.map((job) => (
                                <div key={job._id} className="p-4 hover:bg-gray-50 transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <Link to={`/jobs/${job._id}`} className="text-indigo-600 font-bold hover:underline">
                                                {job.jobId}
                                            </Link>
                                            <div className="text-sm font-medium text-gray-800 mt-1 flex items-center">
                                                <Smartphone size={14} className="mr-2" /> {job.device_model}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                job.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm line-clamp-1">{job.fault_description}</p>
                                    <div className="mt-2 text-xs text-gray-400">
                                        Recorded on {new Date(job.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDetails;
