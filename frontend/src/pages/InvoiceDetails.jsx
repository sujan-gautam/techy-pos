import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { ArrowLeft, Printer, DollarSign, Download, CheckCircle, Smartphone } from 'lucide-react';

const InvoiceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);

    const fetchInvoice = async () => {
        try {
            const { data } = await api.get(`/invoices/${id}`);
            setInvoice(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load invoice');
            navigate('/invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const handlePay = async (method) => {
        if (!window.confirm(`Mark as PAID via ${method}?`)) return;
        setPaying(true);
        try {
            await api.put(`/invoices/${id}/pay`, { method });
            toast.success('Invoice Paid Successfully');
            fetchInvoice();
        } catch (error) {
            toast.error('Payment update failed');
        } finally {
            setPaying(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Invoice...</div>;
    if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header / Actions - Hidden during print */}
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Invoice Details</h1>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                    >
                        <Printer size={18} />
                        <span>Print</span>
                    </button>
                    {invoice.status !== 'paid' && (
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePay('cash')}
                                disabled={paying}
                                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <DollarSign size={18} />
                                <span>Pay Cash</span>
                            </button>
                            <button
                                onClick={() => handlePay('card')}
                                disabled={paying}
                                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Smartphone size={18} />
                                <span>Pay Card</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Document Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
                {/* Header */}
                <div className="p-8 border-b-2 border-gray-100 flex justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-indigo-600 tracking-tighter">TECHYPOS</h2>
                        <p className="text-gray-500 text-sm mt-1">Repair Shop Management System</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-bold text-gray-800">INVOICE</h3>
                        <p className="text-indigo-600 font-mono font-bold">{invoice.invoiceId}</p>
                        <p className="text-gray-500 text-sm mt-1">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                        <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {invoice.status}
                        </div>
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-8 p-8 bg-gray-50/50">
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Billed From</h4>
                        <div className="font-bold text-gray-800">TechyPOS Solutions</div>
                        <div className="text-gray-600 text-sm">123 Tech Avenue, Silicon Valley</div>
                        <div className="text-gray-600 text-sm">contact@techypos.com</div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Billed To</h4>
                        <div className="font-bold text-gray-800">{invoice.customer.name}</div>
                        <div className="text-gray-600 text-sm">{invoice.customer.phone}</div>
                        <div className="text-gray-600 text-sm">{invoice.customer.email}</div>
                        {invoice.jobId && (
                            <div className="mt-2 text-xs text-indigo-600 font-medium">
                                Job Reference: <Link to={`/jobs/${invoice.jobId._id}`} className="underline">{invoice.jobId.jobId}</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="p-8">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-200">
                            <tr>
                                <th className="py-3 text-sm font-bold text-gray-400 uppercase">Description</th>
                                <th className="py-3 text-sm font-bold text-gray-400 uppercase text-center">Qty</th>
                                <th className="py-3 text-sm font-bold text-gray-400 uppercase text-right">Unit Price</th>
                                <th className="py-3 text-sm font-bold text-gray-400 uppercase text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {invoice.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-4">
                                        <div className="font-medium text-gray-800">{item.description}</div>
                                        <div className="text-xs text-gray-400 capitalize">{item.type}</div>
                                    </td>
                                    <td className="py-4 text-center text-gray-600 font-mono">{item.qty}</td>
                                    <td className="py-4 text-right text-gray-600 font-mono">${item.unitPrice.toFixed(2)}</td>
                                    <td className="py-4 text-right font-bold text-gray-800 font-mono">${item.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                    <div className="w-full max-w-xs space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Subtotal</span>
                            <span className="text-gray-800 font-mono font-bold">${invoice.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Tax (10%)</span>
                            <span className="text-gray-800 font-mono font-bold">${invoice.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-3">
                            <span className="text-lg font-black text-gray-800 uppercase tracking-tighter">Total</span>
                            <span className="text-2xl font-black text-indigo-600 font-mono">${invoice.total.toFixed(2)}</span>
                        </div>

                        {invoice.status === 'paid' && (
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-center font-bold flex items-center justify-center">
                                <CheckCircle size={18} className="mr-2" />
                                PAID IN FULL
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 text-center text-gray-400 text-xs">
                    <p>Thank you for your business!</p>
                    <p className="mt-1">Terms: Payment is due within 15 days.</p>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetails;
