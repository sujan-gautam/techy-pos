import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Wrench, Package, Users,
    FileText, ShoppingCart, Truck, LogOut, Settings, BarChart2, ShieldCheck, History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const Sidebar = () => {
    const { logout, user } = useAuth();

    // Roles: 'admin', 'manager', 'technician'
    const navItems = [
        {
            name: 'Dashboard',
            path: '/',
            icon: LayoutDashboard,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Repair Jobs',
            path: '/jobs',
            icon: Wrench,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Inventory',
            path: '/inventory',
            icon: Package,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Use Parts',
            path: '/use-parts',
            icon: Wrench,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Parts Catalog',
            path: '/parts',
            icon: Package,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Usage Logs',
            path: '/usage-logs',
            icon: History,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Customers',
            path: '/customers',
            icon: Users,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Suppliers',
            path: '/suppliers',
            icon: Truck,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Invoices',
            path: '/invoices',
            icon: FileText,
            allowedRoles: ['admin', 'manager', 'technician']
        },
        {
            name: 'Purchase Orders',
            path: '/pos',
            icon: ShoppingCart,
            allowedRoles: ['admin', 'manager']
        },
        {
            name: 'Reports',
            path: '/reports',
            icon: BarChart2,
            allowedRoles: ['admin', 'manager']
        },
        {
            name: 'Audit Logs',
            path: '/audit-logs',
            icon: ShieldCheck,
            allowedRoles: ['admin']
        },
        {
            name: 'System Users',
            path: '/users',
            icon: Settings,
            allowedRoles: ['admin']
        },
    ];

    return (
        <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col fixed shadow-sm">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
                <Logo />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
                {navItems.map((item) => (
                    item.allowedRoles.includes(user?.role) && (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={18} className={clsx("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-gray-400 group-hover:text-blue-600")} />
                                    <span className="text-sm tracking-tight">{item.name}</span>
                                </>
                            )}
                        </NavLink>
                    )
                ))}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/50">
                <div className="flex items-center space-x-3 mb-4 px-2">
                    <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-blue-600 font-bold text-xs">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate leading-tight">{user?.name}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-200 hover:border-red-100 hover:bg-red-50 hover:text-red-600 text-gray-600 py-2 rounded-xl transition-all text-sm font-bold shadow-sm"
                >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};

// Helper for conditional classes
function clsx(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default Sidebar;
