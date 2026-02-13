import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'react-toastify';
import {
    RefreshCw, Download, FileText, FileSpreadsheet,
    FileIcon, Calendar, Filter, Database, Search
} from 'lucide-react';
import { format, subDays, startOfToday, startOfMonth } from 'date-fns';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('summary');
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Export State
    const [reportType, setReportType] = useState('sales');
    const [fileFormat, setFileFormat] = useState('pdf');
    const [exportFilters, setExportFilters] = useState({
        startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        threshold: '',
        status: ''
    });

    const [globalDates, setGlobalDates] = useState({
        startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'summary') {
                const { data } = await api.get(`/reports/stats?startDate=${globalDates.startDate}&endDate=${globalDates.endDate}`);
                setStats(data);
            } else if (activeTab === 'audit') {
                const { data } = await api.get(`/transactions?startDate=${globalDates.startDate}&endDate=${globalDates.endDate}&pageSize=100`);
                setLogs(data.transactions);
            }
        } catch (error) {
            toast.error('Data retrieval failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [globalDates, activeTab]);

    const handleExport = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/reports/data`, {
                params: {
                    type: reportType,
                    startDate: exportFilters.startDate,
                    endDate: exportFilters.endDate,
                    minQty: exportFilters.threshold,
                    status: exportFilters.status
                }
            });

            try {
                if (fileFormat === 'pdf') generatePDF(data);
                else if (fileFormat === 'excel') generateExcel(data);
                else generateCSV(data);
                toast.success('Report downloaded');
            } catch (genError) {
                console.error('Doc generation error:', genError);
                toast.error('Error creating document bundle');
            }
        } catch (error) {
            console.error('Export fetch error:', error);
            toast.error('Data retrieval failed');
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = (data) => {
        const doc = new jsPDF();
        const title = `${reportType.toUpperCase()} REPORT`;
        doc.setFontSize(16);
        doc.text(title, 14, 20);
        doc.setFontSize(10);
        doc.text(`Period: ${exportFilters.startDate} to ${exportFilters.endDate}`, 14, 28);

        let headers = [];
        let body = [];

        if (reportType === 'sales') {
            headers = [['Invoice ID', 'Customer', 'Total', 'Tax', 'Date']];
            body = data.map(inv => [inv.invoiceId, inv.customer?.name || 'Walk-in', `$${inv.total}`, `$${inv.tax}`, format(new Date(inv.paymentDetails?.paidAt || inv.createdAt), 'yyyy-MM-dd')]);
        } else if (reportType === 'inventory') {
            headers = [['SKU', 'Part Name', 'Qty', 'Unit Cost', 'Value']];
            body = data.map(i => [
                i.partId?.sku || 'N/A',
                i.partId?.name || 'Manual Item',
                i.quantity || 0,
                `$${i.partId?.cost || 0}`,
                `$${((i.quantity || 0) * (i.partId?.cost || 0)).toFixed(2)}`
            ]);
        } else if (reportType === 'jobs') {
            headers = [['Job ID', 'Customer', 'Device', 'Status', 'Total']];
            body = data.map(j => [j.jobId, j.customer?.name || 'N/A', j.device_model, j.status, `$${j.totalCost}`]);
        }

        autoTable(doc, { head: headers, body: body, startY: 35, theme: 'striped', headStyles: { fillColor: [51, 65, 85] } });
        doc.save(`${reportType}_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    const generateExcel = (data) => {
        let sheetData = data.map(item => {
            if (reportType === 'sales') return { 'ID': item.invoiceId, 'Customer': item.customer?.name || 'Walk-in', 'Total': item.total, 'Date': item.createdAt };
            if (reportType === 'inventory') return {
                'SKU': item.partId?.sku || 'N/A',
                'Name': item.partId?.name || 'Manual Item',
                'Qty': item.quantity || 0,
                'Value': (item.quantity || 0) * (item.partId?.cost || 0)
            };
            return { 'Job ID': item.jobId, 'Device': item.device_model, 'Status': item.status, 'Cost': item.totalCost, 'Customer': item.customer?.name || 'N/A' };
        });
        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${reportType}_report.xlsx`);
    };

    const generateCSV = (data) => {
        let sheetData = data.map(item => {
            if (reportType === 'sales') return { 'ID': item.invoiceId, 'Total': item.total };
            return item;
        });
        const ws = XLSX.utils.json_to_sheet(sheetData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `${reportType}_report.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 mb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
                    <p className="text-slate-500 text-sm mt-1">Management summary and data export tools.</p>
                </div>

                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                    <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden h-9">
                        <input
                            type="date"
                            className="px-2 text-xs font-medium border-r border-slate-100 outline-none"
                            value={globalDates.startDate}
                            onChange={(e) => setGlobalDates({ ...globalDates, startDate: e.target.value })}
                        />
                        <input
                            type="date"
                            className="px-2 text-xs font-medium outline-none"
                            value={globalDates.endDate}
                            onChange={(e) => setGlobalDates({ ...globalDates, endDate: e.target.value })}
                        />
                    </div>
                    <button onClick={fetchData} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveTab('summary')} className={clsx("px-6 py-1.5 text-xs font-medium rounded-md transition-all", activeTab === 'summary' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    Summary
                </button>
                <button onClick={() => setActiveTab('export')} className={clsx("px-6 py-1.5 text-xs font-medium rounded-md transition-all", activeTab === 'export' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    Export Center
                </button>
                <button onClick={() => setActiveTab('audit')} className={clsx("px-6 py-1.5 text-xs font-medium rounded-md transition-all", activeTab === 'audit' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    Audit Log
                </button>
            </div>

            {loading && activeTab !== 'export' ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : activeTab === 'summary' ? (
                <div className="space-y-6">
                    {/* Basic Stat Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCell title="Total Sales" value={stats?.revenue} isCurrency />
                        <SummaryCell title="Open Repair Jobs" value={stats?.activeRepairs} />
                        <SummaryCell title="Parts Issued" value={stats?.usageStats?.weekly || 0} />
                        <SummaryCell title="Completion Rate" value={stats?.jobCounts.completed > 0 ? ((stats.jobCounts.completed / (stats.jobCounts.completed + stats.jobCounts.cancelled)) * 100).toFixed(1) + '%' : '0%'} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Revenue History</h3>
                            </div>
                            <div className="p-5 h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats?.weeklyRevenue}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                                        <Area type="monotone" dataKey="revenue" stroke="#334155" fill="#f8fafc" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Job Distribution</h3>
                            </div>
                            <div className="p-5 h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { n: 'Pending', c: stats?.jobCounts.pending },
                                        { n: 'Active', c: stats?.activeRepairs },
                                        { n: 'Done', c: stats?.jobCounts.completed },
                                        { n: 'Void', c: stats?.jobCounts.cancelled },
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="n" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Bar dataKey="c" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'export' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
                        <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">Download Reports</h3>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Report Type</label>
                                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-medium outline-none focus:border-slate-400 transition-colors">
                                    <option value="sales">Sales & Revenue</option>
                                    <option value="inventory">Inventory Stock</option>
                                    <option value="jobs">Service Jobs</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">From Date</label>
                                    <input type="date" value={exportFilters.startDate} onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To Date</label>
                                    <input type="date" value={exportFilters.endDate} onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium outline-none" />
                                </div>
                            </div>

                            {reportType === 'inventory' && (
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock Less Than</label>
                                    <input type="number" value={exportFilters.threshold} onChange={(e) => setExportFilters({ ...exportFilters, threshold: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-medium outline-none" placeholder="All items" />
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">File Format</label>
                                <div className="flex space-x-2">
                                    {['pdf', 'excel', 'csv'].map(f => (
                                        <button key={f} onClick={() => setFileFormat(f)} className={clsx("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border rounded transition-all", fileFormat === f ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600")}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleExport} disabled={loading} className="w-full bg-slate-900 text-white font-bold py-3 rounded text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50">
                                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                <span>Generate Data</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center">
                        <FileIcon size={32} className="text-slate-300 mb-4" />
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ready for Export</h4>
                        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">Select documented parameters on the left to generate your file. All dates are inclusive.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Activity Log</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variance</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">User</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-slate-400 text-xs italic font-medium">No records found.</td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4 text-[11px] font-medium text-slate-900">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm')}</td>
                                            <td className="px-5 py-4">
                                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                                                    {log.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-[11px] font-bold text-slate-900">{log.partId?.name || 'Manual Adjustment'}</div>
                                                <div className="text-[9px] text-slate-400 uppercase tracking-tighter">{log.partId?.sku || log.referenceType}</div>
                                            </td>
                                            <td className="px-5 py-4 flex items-center">
                                                <span className={clsx("text-[11px] font-bold", log.qtyChange > 0 ? "text-slate-600" : "text-slate-600")}>
                                                    {log.qtyChange > 0 ? '+' : ''}{log.qtyChange}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right text-[10px] font-bold text-slate-900">{log.performedBy?.name}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const SummaryCell = ({ title, value, isCurrency }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-bold text-slate-900">
            {isCurrency ? `$${Number(value).toLocaleString()}` : value || '0'}
        </p>
    </div>
);

export default Reports;
