import React from 'react';
import { Card } from '@/components/ui/card';
import { MessageCircle, AlertTriangle, TrendingUp, Clock, User } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { openWhatsApp } from '@/utils/whatsapp';
import { differenceInDays, parseISO } from 'date-fns';

const priorityConfig = {
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  media: { label: 'Média', color: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', color: 'bg-amber-100 text-amber-700' },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

function formatCurrency(value) {
  if (!value) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getDaysStagnated(client) {
  const ref = client.last_contact_date || client.updated_date || client.created_date;
  if (!ref) return 0;
  try {
    return differenceInDays(new Date(), parseISO(ref));
  } catch {
    return 0;
  }
}

export default function CrmCard({ client, provided, isDragging }) {
  const days = getDaysStagnated(client);
  const isStagnated = days >= 7;
  const priority = priorityConfig[client.priority] || priorityConfig.media;

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    if (!client.phone) return;
    const phone = client.phone.replace(/\D/g, '');
    openWhatsApp(`55${phone}`);
  };

  const handleCardClick = () => {
    window.location.href = `${createPageUrl('ClientDetail')}?id=${client.id}`;
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className="mb-2"
    >
      <Card
        onClick={handleCardClick}
        className={`p-3 cursor-pointer hover:shadow-md transition-all border-l-4 ${
          isStagnated ? 'border-l-red-400' :
          client.priority === 'urgente' ? 'border-l-red-500' :
          client.priority === 'alta' ? 'border-l-amber-500' :
          client.priority === 'media' ? 'border-l-blue-400' :
          'border-l-slate-200'
        } ${isDragging ? 'shadow-xl rotate-1 opacity-90' : ''}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-1 mb-2">
          <p className="font-semibold text-sm text-slate-900 leading-tight flex-1 line-clamp-2">
            {client.full_name}
          </p>
          {client.phone && (
            <button
              onClick={handleWhatsApp}
              className="flex-shrink-0 text-emerald-600 hover:text-emerald-700 p-0.5 hover:bg-emerald-50 rounded"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Responsável */}
        {client.responsible_professional && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
            <User className="h-3 w-3" />
            <span className="truncate">{client.responsible_professional}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-1 mt-2">
          {/* Prioridade */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.color}`}>
            {priority.label}
          </span>

          {/* Valor estimado */}
          {client.estimated_value > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              {formatCurrency(client.estimated_value)}
            </span>
          )}

          {/* Estagnação */}
          {isStagnated && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {days}d sem contato
            </span>
          )}

          {!isStagnated && days > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              {days}d
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}