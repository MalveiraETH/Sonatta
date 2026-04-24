import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import CrmCard from './CrmCard';

function formatCurrency(value) {
  if (!value) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

export default function CrmColumn({ column, clients }) {
  const totalValue = clients.reduce((sum, c) => sum + (c.estimated_value || 0), 0);

  return (
    <div className="flex-shrink-0 w-64 flex flex-col">
      {/* Column Header */}
      <div className={`rounded-t-xl px-3 py-2.5 ${column.headerBg}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{column.icon}</span>
            <h3 className={`font-bold text-sm ${column.headerText}`}>{column.label}</h3>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${column.badgeBg} ${column.badgeText}`}>
            {clients.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className={`text-xs font-medium ${column.headerText} opacity-80`}>
            💰 {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[200px] p-2 rounded-b-xl border-x border-b transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {clients.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-xs text-slate-400 italic">
                Nenhum cliente
              </div>
            )}
            {clients.map((client, index) => (
              <Draggable key={client.id} draggableId={client.id} index={index}>
                {(provided, snapshot) => (
                  <CrmCard
                    client={client}
                    provided={provided}
                    isDragging={snapshot.isDragging}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}