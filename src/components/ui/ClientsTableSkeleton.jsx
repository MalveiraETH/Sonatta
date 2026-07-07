import React from 'react';
import { Card } from '@/components/ui/card';

function SkeletonBox({ className }) {
  return <div className={`bg-slate-200 rounded animate-pulse ${className}`} />;
}

export function ClientsTableSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <SkeletonBox className="h-8 w-36" />
          <SkeletonBox className="h-4 w-48" />
        </div>
        <SkeletonBox className="h-9 w-36" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <SkeletonBox className="h-4 w-16 mb-2" />
            <SkeletonBox className="h-8 w-12" />
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <Card className="p-4 hidden lg:block">
        <div className="flex gap-3">
          <SkeletonBox className="h-9 flex-1" />
          <SkeletonBox className="h-9 w-48" />
          <SkeletonBox className="h-9 w-20" />
        </div>
      </Card>

      {/* Table */}
      <Card className="hidden lg:block overflow-hidden">
        <div className="p-4 border-b border-slate-100 grid grid-cols-4 gap-4">
          {['Nome', 'Telefone', 'Status', 'Ações'].map(h => (
            <SkeletonBox key={h} className="h-4 w-20" />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 border-b border-slate-50 grid grid-cols-4 gap-4 items-center">
            <div className="space-y-1.5">
              <SkeletonBox className="h-4 w-40" />
              <SkeletonBox className="h-3 w-28" />
            </div>
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-6 w-24 rounded-full" />
            <div className="flex gap-2 justify-center">
              <SkeletonBox className="h-8 w-8 rounded-md" />
              <SkeletonBox className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </Card>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1.5 flex-1">
                <SkeletonBox className="h-4 w-40" />
                <SkeletonBox className="h-3 w-28" />
              </div>
              <SkeletonBox className="h-8 w-8 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}