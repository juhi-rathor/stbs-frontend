"use client";

export default function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="w-full bg-white rounded-2xl border border-zinc-150 overflow-hidden animate-pulse">
      {/* Skeleton Header */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center justify-between gap-4">
        {[...Array(cols)].map((_, i) => (
          <div 
            key={i} 
            className={`h-4 bg-zinc-200 rounded ${
              i === 0 ? "w-16" : i === 1 ? "w-32" : "w-20"
            }`}
          />
        ))}
      </div>
      
      {/* Skeleton Rows */}
      <div className="divide-y divide-zinc-100">
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="px-6 py-5 flex items-center justify-between gap-4 hover:bg-zinc-50/50 transition">
            {[...Array(cols)].map((_, c) => (
              <div 
                key={c} 
                className={`h-3 bg-zinc-200/80 rounded ${
                  c === 0 ? "w-12" : c === 1 ? "w-40" : "w-16"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
