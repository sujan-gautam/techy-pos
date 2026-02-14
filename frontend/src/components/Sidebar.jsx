import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Wrench, Package, Users, StickyNote,
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
            name: 'My Notebook',
            path: '/notes',
            icon: StickyNote,
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
            icon: Users,
            allowedRoles: ['admin']
        },
        {
            name: 'Site Settings',
            path: '/settings',
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
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-gray-50 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium"
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
