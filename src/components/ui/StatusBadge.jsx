import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig = {
  // Client Status
  lead: { label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  em_teste: { label: 'Em Teste', color: 'bg-purple-100 text-purple-700' },
  cliente_ativo: { label: 'Cliente Ativo', color: 'bg-emerald-100 text-emerald-700' },
  pos_venda: { label: 'Pós-Venda', color: 'bg-amber-100 text-amber-700' },

  // Appointment Status
  agendado: { label: 'Agendado', color: 'bg-blue-100 text-blue-700' },
  confirmado: { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700' },
  realizado: { label: 'Realizado', color: 'bg-slate-100 text-slate-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },

  // Quote Status
  criado: { label: 'Criado', color: 'bg-slate-100 text-slate-700' },
  enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  convertido: { label: 'Convertido', color: 'bg-purple-100 text-purple-700' },

  // Sale/Payment Status
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  pago: { label: 'Pago', color: 'bg-emerald-100 text-emerald-700' },

  // Contract Status
  gerado: { label: 'Gerado', color: 'bg-slate-100 text-slate-700' },
  assinado: { label: 'Assinado', color: 'bg-emerald-100 text-emerald-700' },
  arquivado: { label: 'Arquivado', color: 'bg-blue-100 text-blue-700' },

  // Product Status
  disponivel: { label: 'Disponível', color: 'bg-emerald-100 text-emerald-700' },
  reservado: { label: 'Reservado', color: 'bg-amber-100 text-amber-700' },
  vendido: { label: 'Vendido', color: 'bg-slate-100 text-slate-700' },
  esgotado: { label: 'Esgotado', color: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
  
  return (
    <Badge className={cn(
      "font-medium border-0",
      config.color
    )}>
      {config.label}
    </Badge>
  );
}