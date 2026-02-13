import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import api from '../api/axios';
import socket from '../api/socket';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Wrench, Clock, AlertTriangle, TrendingUp, Package, Users, ChevronRight, Activity, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/reports/stats');
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        socket.on('job_update', () => fetchStats());
        socket.on('stock_update', () => fetchStats());
        socket.on('invoice_update', () => fetchStats());
        return () => {
            socket.off('job_update');
            socket.off('stock_update');
            socket.off('invoice_update');
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const getStatusStyles = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-50 text-green-700 border-green-100';
            case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'diagnosing': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'waiting_parts': return 'bg-orange-50 text-orange-700 border-orange-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Overview of your shop performance and recent activity.</p>
                </div>
                <Link to="/jobs/new" className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm shadow-md transition-all active:scale-95">
                    <Plus size={18} />
                    <span>Create New Job</span>
                </Link>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Revenue"
                    value={stats.revenue}
                    isCurrency
                    icon={<DollarSign size={18} />}
                    color="blue"
                    subtext="lifetime paid total"
                />
                <StatCard
                    title="Active Jobs"
                    value={stats.activeRepairs}
                    icon={<Wrench size={18} />}
                    color="emerald"
                    subtext="current workload"
                />
                <StatCard
                    title="Parts Used"
                    value={stats.usageStats?.today || 0}
                    icon={<Package size={18} />}
                    color="purple"
                    subtext={`today's consumption`}
                />
                <StatCard
                    title="Pending"
                    value={stats.jobCounts.pending}
                    icon={<Clock size={18} />}
                    color="amber"
                    subtext="waiting tech"
                />
                <StatCard
                    title="Low Stock"
                    value={stats.lowStockCount}
                    icon={<AlertTriangle size={18} />}
                    color="red"
                    subtext="reorder alerts"
                    isAlert={stats.lowStockCount > 0}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Overview */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Revenue Trends</h3>
                        </div>
                        <span className="text-sm font-medium text-gray-400">Last 7 Days (USD)</span>
                    </div>
                    <div className="p-6 h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.weeklyRevenue}>
                                <defs>
                                    <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    fontWeight="500"
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    fontWeight="500"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        fontSize: '14px',
                                        fontWeight: '600'
                                    }}
                                    formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#dashboardRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Jobs Activity */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                <Activity size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Recent Jobs</h3>
                        </div>
                    </div>

                    <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
                        {stats.recentJobs?.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 font-medium">No recent activity</div>
                        ) : stats.recentJobs.map(job => (
                            <Link key={job._id} to={`/jobs/${job._id}`} className="block p-5 hover:bg-gray-50 transition-all group">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                        #{job.jobId}
                                    </span>
                                    <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border", getStatusStyles(job.status))}>
                                        {job.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {job.device_model}
                                </div>
                                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                                    <span className="font-medium">{job.customer?.name}</span>
                                    <span className="text-gray-400">
                                        {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="p-4 border-t border-gray-100">
                        <Link to="/jobs" className="flex items-center justify-center space-x-2 w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all">
                            <span>View All Jobs</span>
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, subtext, isCurrency, isAlert }) => {
    const colorMap = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        red: 'text-red-700 bg-red-50 border-red-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
    };

    return (
        <div className={clsx(
            "bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all group relative overflow-hidden",
            isAlert && "ring-2 ring-red-500/10 border-red-200 bg-red-50/10"
        )}>
            <div className="flex items-center justify-between mb-4">
                <div className={clsx('p-3 rounded-xl border shadow-sm', colorMap[color])}>
                    {icon}
                </div>
                {isAlert && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border border-red-200">
                        Attention
                    </span>
                )}
            </div>

            <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
                <div className="flex items-baseline space-x-2">
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                        {isCurrency ? `$${Number(value).toLocaleString()}` : value || '0'}
                    </p>
                </div>
                <p className="mt-2 text-xs font-medium text-gray-400 italic">
                    {subtext}
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
