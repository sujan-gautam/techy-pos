import React from 'react';

const CardSkeleton = ({ count = 4 }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                    <div className="h-8 w-20 bg-gray-300 rounded animate-pulse mb-2"></div>
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"></div>
                </div>
            ))}
        </div>
    );
};

export default CardSkeleton;
