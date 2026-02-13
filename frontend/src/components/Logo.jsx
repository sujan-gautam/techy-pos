import React from 'react';
import { Store } from 'lucide-react';

const Logo = ({ size = 'medium', className = '' }) => {
    const isSmall = size === 'small';
    const isLarge = size === 'large';

    const iconSize = isSmall ? 16 : isLarge ? 24 : 20;
    const containerSize = isSmall ? 'w-8 h-8' : isLarge ? 'w-11 h-11 border-[1.5px]' : 'w-9 h-9 border';

    return (
        <div className={`flex items-center space-x-3 ${className}`}>
            <div className={`flex items-center justify-center rounded-sm bg-slate-900 border-slate-900 shadow-sm ${containerSize}`}>
                <Store
                    size={iconSize}
                    className="text-white"
                    strokeWidth={2.5}
                />
            </div>

            {!isSmall && (
                <div className="flex flex-col">
                    <h1 className={`font-black tracking-tighter text-slate-900 leading-none ${isLarge ? 'text-2xl' : 'text-lg'}`}>
                        TECHY<span className="text-slate-400 ml-0.5">POS</span>
                    </h1>
                </div>
            )}
        </div>
    );
};

export default Logo;
