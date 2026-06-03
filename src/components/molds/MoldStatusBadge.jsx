import React from 'react';

const STATUS_CONFIG = {
  impressao_coletada: { label: 'Impressão Coletada', cls: 'bg-slate-100 text-slate-700' },
  enviado_ao_fornecedor: { label: 'Enviado ao Fornecedor', cls: 'bg-blue-100 text-blue-700' },
  em_producao: { label: 'Em Produção', cls: 'bg-amber-100 text-amber-700' },
  recebido: { label: 'Recebido ✓', cls: 'bg-emerald-100 text-emerald-700' },
  entregue_ao_cliente: { label: 'Entregue', cls: 'bg-violet-100 text-violet-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-red-100 text-red-600' },
};

export default function MoldStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}