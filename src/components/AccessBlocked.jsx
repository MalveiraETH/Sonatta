import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ShieldX, LogOut } from 'lucide-react';

export default function AccessBlocked() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldX className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Acesso inativado</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Seu acesso ao sistema Sonatta está inativado. Fale com um administrador para reativá-lo.
        </p>
        <Button
          onClick={() => base44.auth.logout()}
          variant="outline"
          className="mt-6 gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}