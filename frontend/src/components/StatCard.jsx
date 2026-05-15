import React from 'react';

export default function StatCard({ emoji, label, value, unit }) {
  const hasValue = value !== undefined && value !== null;
  return (
    <div className="bg-white shadow rounded-xl p-4 text-center">
      <span className="text-2xl">{emoji}</span>
      {hasValue ? (
        <>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-xs text-gray-400">{unit}</p>
        </>
      ) : (
        <div className="mt-2 space-y-1.5 flex flex-col items-center">
          <div className="h-7 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-8 bg-gray-100 rounded animate-pulse" />
        </div>
      )}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
