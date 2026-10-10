import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { VARIABLE_GROUPS } from '@/lib/documentVariables';

export default function TemplateVariablesMenu({ onInsert, disabled }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Zap className="h-3.5 w-3.5" />
          Variáveis
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5 max-h-80 overflow-y-auto">
        {VARIABLE_GROUPS.map((g) => (
          <div key={g.group}>
            <button
              type="button"
              onClick={() => setExpanded((prev) => (prev === g.group ? null : g.group))}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium text-slate-700">{g.group}</span>
              {expanded === g.group ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expanded === g.group && (
              <div className="pb-1">
                {g.items.map((item) => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => {
                      onInsert(item.token);
                      setOpen(false);
                    }}
                    className="w-full text-left pl-6 pr-3 py-1.5 rounded-md hover:bg-[#EDE9FE] transition-colors"
                  >
                    <span className="text-xs text-slate-700">{item.label}</span>
                    <span className="block text-[10px] font-mono text-slate-400">
                      {item.token}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}