import React, { useState, useEffect, useRef } from 'react';
import { Bell, Info, AlertTriangle, Package, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications');
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark as read');
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read');
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getIcon = (type) => {
        switch (type) {
            case 'low_stock': return <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100"><AlertTriangle size={16} /></div>;
            case 'purchase_order': return <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100"><Package size={16} /></div>;
            default: return <div className="p-2 bg-gray-50 text-gray-600 rounded-lg border border-gray-100"><Info size={16} /></div>;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all active:scale-95 border border-transparent hover:border-blue-100"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0">
                        <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[350px] overflow-y-auto italic-last">
                        {notifications.length === 0 ? (
                            <div className="py-12 px-5 text-center">
                                <Bell size={32} className="mx-auto text-gray-100 mb-3" />
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">All caught up</p>
                                <p className="text-[10px] text-gray-300 mt-1">No new alerts to show</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n._id}
                                    onClick={() => !n.isRead && markAsRead(n._id)}
                                    className={`px-5 py-4 border-b border-gray-50 flex items-start space-x-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/10' : ''}`}
                                >
                                    {getIcon(n.type)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className={`text-[11px] font-bold ${!n.isRead ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</p>
                                            <span className="text-[10px] text-gray-300 font-medium">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                        {n.link && (
                                            <Link
                                                to={n.link}
                                                className="inline-flex items-center text-[9px] font-black text-blue-600 uppercase tracking-widest mt-2 hover:underline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsOpen(false);
                                                    markAsRead(n._id);
                                                }}
                                            >
                                                View Details
                                            </Link>
                                        )}
                                    </div>
                                    {!n.isRead && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shadow-sm"></div>}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 bg-gray-50 text-center">
                        <Link
                            to="/audit-logs"
                            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            View All Activity
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
