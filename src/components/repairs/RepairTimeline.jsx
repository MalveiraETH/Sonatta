import { CheckCircle, Circle, Clock } from 'lucide-react';

const STEPS = [
  { key: 'aberto', label: 'OS Aberta', date_field: 'date_opened' },
  { key: 'enviado_ao_fornecedor', label: 'Enviado ao Fornecedor', date_field: 'date_sent_to_supplier' },
  { key: 'em_reparo', label: 'Em Reparo', date_field: 'date_received_by_supplier' },
  { key: 'reparado', label: 'Reparado', date_field: 'date_returned_from_supplier' },
  { key: 'aguardando_retirada', label: 'Aguardando Retirada', date_field: null },
  { key: 'devolvido_ao_cliente', label: 'Devolvido ao Cliente', date_field: 'date_returned_to_client' },
];

const STATUS_ORDER = ['aberto', 'enviado_ao_fornecedor', 'em_reparo', 'reparado', 'aguardando_retirada', 'devolvido_ao_cliente'];

export default function RepairTimeline({ repair }) {
  const currentIndex = STATUS_ORDER.indexOf(repair.status);

  return (
    <div className="flex flex-col gap-0 py-2">
      {STEPS.map((step, idx) => {
        const isDone = currentIndex > idx;
        const isCurrent = currentIndex === idx;
        const dateVal = step.date_field ? repair[step.date_field] : null;

        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-green-500' : isCurrent ? 'bg-[#6B3FA0]' : 'bg-slate-200'
              }`}>
                {isDone
                  ? <CheckCircle className="w-4 h-4 text-white" />
                  : isCurrent
                  ? <Clock className="w-4 h-4 text-white" />
                  : <Circle className="w-4 h-4 text-slate-400" />
                }
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-0.5 h-8 ${isDone ? 'bg-green-300' : 'bg-slate-200'}`} />
              )}
            </div>
            <div className="pb-4">
              <p className={`text-sm font-medium ${isDone ? 'text-green-700' : isCurrent ? 'text-[#6B3FA0]' : 'text-slate-400'}`}>
                {step.label}
              </p>
              {dateVal && (
                <p className="text-xs text-slate-500">
                  {new Date(dateVal + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}