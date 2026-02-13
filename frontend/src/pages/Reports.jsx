import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'react-toastify';
import { RefreshCw } from 'lucide-react';

const Reports = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/stats');
            setStats(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load report stats');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Report Data...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

    const jobData = [
        { name: 'Pending', value: stats.jobCounts.pending || 0, color: '#f59e0b' },
        { name: 'In Progress', value: stats.jobCounts.in_progress || 0, color: '#3b82f6' },
        { name: 'Completed', value: stats.jobCounts.completed || 0, color: '#10b981' },
        { name: 'Cancelled', value: stats.jobCounts.cancelled || 0, color: '#ef4444' },
    ];

    const showStats = stats.jobCounts.pending !== undefined;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Business Reports</h1>
                <button
                    onClick={fetchStats}
                    className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg"
                >
                    <RefreshCw size={18} />
                    <span>Refresh Data</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 font-medium text-sm mb-2">Total Jobs (Active)</h3>
                    <p className="text-3xl font-bold text-indigo-600">
                        {(stats.jobCounts.pending || 0) + (stats.jobCounts.in_progress || 0)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 font-medium text-sm mb-2">Completed Jobs</h3>
                    <p className="text-3xl font-bold text-green-600">{stats.jobCounts.completed || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 font-medium text-sm mb-2">Low Stock Alerts</h3>
                    <p className="text-3xl font-bold text-red-500">{stats.lowStockCount || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Job Distribution Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-96 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Job Status Distribution</h3>
                    <div className="flex-1 w-full relative">
                        {showStats && Object.values(stats.jobCounts).some(v => v > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={jobData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                                    >
                                        {jobData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                No job data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Placeholder for Revenue or other charts */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-96 flex flex-col justify-center items-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Revenue Analytics</h3>
                    <p className="text-gray-400 text-sm text-center max-w-xs">
                        Revenue tracking will be available once invoicing module is implemented.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Reports;
