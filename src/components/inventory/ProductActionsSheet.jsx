import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * Folha inferior com as ações do produto.
 * Padrão de toque para o celular — o menu suspenso não responde de forma confiável
 * quando fica dentro de um card que também é clicável.
 */
export default function ProductActionsSheet({ open, onOpenChange, title, subtitle, actions = [] }) {
  const visibleActions = actions.filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader className="text-left space-y-0.5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </SheetHeader>

        <div className="mt-5 space-y-1">
          {visibleActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  action.onClick?.();
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100',
                  action.className
                )}
              >
                {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                <span className="flex-1">{action.label}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}