import React from 'react';
import { Store } from 'lucide-react';

const Logo = ({ size = 'medium', className = '' }) => {
    const isSmall = size === 'small';
    const isLarge = size === 'large';

    const iconSize = isSmall ? 18 : isLarge ? 28 : 22;
    const containerSize = isSmall ? 'w-8 h-8' : isLarge ? 'w-12 h-12' : 'w-10 h-10';

    return (
        <div className={`flex items-center space-x-3 ${className}`}>
            <div className={`flex items-center justify-center rounded-lg bg-blue-600 shadow-sm ${containerSize}`}>
                <Store
                    size={iconSize}
                    className="text-white"
                />
            </div>

            {!isSmall && (
                <div className="flex flex-col">
                    <h1 className={`font-bold tracking-tight text-gray-900 leading-none ${isLarge ? 'text-2xl' : 'text-lg'}`}>
                        TECHY<span className="text-blue-600 ml-0.5">POS</span>
                    </h1>
                </div>
            )}
        </div>
    );
};

export default Logo;
