import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export default function PullToRefreshIndicator({ isRefreshing, pullDistance }) {
  const shouldShow = isRefreshing || pullDistance > 0;
  const opacity = Math.min(pullDistance / 80, 1);
  
  if (!shouldShow) return null;

  return (
    <div 
      className="fixed top-16 lg:top-0 left-0 right-0 z-40 flex items-center justify-center py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200 transition-all lg:hidden"
      style={{
        opacity: isRefreshing ? 1 : opacity,
        transform: `translateY(${isRefreshing ? '0' : '-100%'})`
      }}
    >
      {isRefreshing ? (
        <>
          <Loader2 className="h-4 w-4 text-[#6B3FA0] animate-spin mr-2" />
          <span className="text-sm text-slate-600">Atualizando...</span>
        </>
      ) : (
        <>
          <RefreshCw 
            className="h-4 w-4 text-[#6B3FA0] mr-2" 
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
          <span className="text-sm text-slate-600">
            {pullDistance > 80 ? 'Solte para atualizar' : 'Puxe para atualizar'}
          </span>
        </>
      )}
    </div>
  );
}