import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for Tailwind classes merging
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Professional Card
 */
export const Card = ({ className, children, ...props }) => (
    <div
        className={cn("bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden", className)}
        {...props}
    >
        {children}
    </div>
);

export const CardHeader = ({ className, children }) => (
    <div className={cn("px-6 py-4 border-b border-gray-100 bg-gray-50/50", className)}>
        {children}
    </div>
);

export const CardTitle = ({ className, children }) => (
    <h3 className={cn("text-lg font-bold text-gray-900 leading-none tracking-tight", className)}>
        {children}
    </h3>
);

export const CardContent = ({ className, children }) => (
    <div className={cn("p-6", className)}>
        {children}
    </div>
);

/**
 * Status Badge
 */
export const Badge = ({ variant = 'default', children, className }) => {
    const variants = {
        default: 'bg-gray-100 text-gray-700 border-gray-200',
        primary: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        warning: 'bg-amber-50 text-amber-700 border-amber-100',
        danger: 'bg-rose-50 text-rose-700 border-rose-100',
        info: 'bg-blue-50 text-blue-700 border-blue-100',
    };

    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider",
            variants[variant] || variants.default,
            className
        )}>
            {children}
        </span>
    );
};

/**
 * Professional Button
 */
export const Button = ({ variant = 'primary', size = 'md', className, children, disabled, ...props }) => {
    const base = "inline-flex items-center justify-center rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-[11px]";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm",
        secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200 shadow-sm",
        danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm",
        ghost: "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-200",
    };

    const sizes = {
        sm: "px-3 py-1.5",
        md: "px-5 py-2.5",
        lg: "px-8 py-3.5",
    };

    return (
        <button
            className={cn(base, variants[variant], sizes[size], className)}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

/**
 * Form Input
 */
export const Input = ({ label, error, className, ...props }) => (
    <div className="space-y-1.5 w-full">
        {label && (
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                {label}
            </label>
        )}
        <input
            className={cn(
                "flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-300",
                error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/5",
                className
            )}
            {...props}
        />
        {error && <p className="text-[10px] font-bold text-rose-500 ml-1">{error}</p>}
    </div>
);

/**
 * Professional Table Components
 */
export const TableContainer = ({ children, className }) => (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-gray-200", className)}>
        <table className="w-full text-left border-collapse min-w-[800px]">
            {children}
        </table>
    </div>
);

export const THead = ({ children }) => (
    <thead className="bg-gray-50/80 border-b border-gray-200">
        {children}
    </thead>
);

export const TBody = ({ children }) => (
    <tbody className="divide-y divide-gray-100">
        {children}
    </tbody>
);

export const Th = ({ children, className }) => (
    <th className={cn("px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]", className)}>
        {children}
    </th>
);

export const Td = ({ children, className }) => (
    <td className={cn("px-6 py-4 text-sm font-medium text-gray-700", className)}>
        {children}
    </td>
);
