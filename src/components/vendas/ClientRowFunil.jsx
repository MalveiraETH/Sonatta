import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Textarea } from '@/components/ui/textarea';
import {
  Baby, GraduationCap, UserCheck, AlertTriangle,
  Clock, TrendingDown, Phone, ChevronDown, ChevronUp,
  MessageSquare, Megaphone, Stethoscope, X, Save,
  CheckCircle2, XCircle, PhoneCall, CalendarCheck, Loader2
} from 'lucide-react';

export const AGE_GROUPS = {
  bebes:    { label: 'Bebês',             sublabel: '0 a 1 ano',   icon: Baby,          bg: 'bg-pink-50',    border: 'border-pink-200',    text: 'text-pink-700',    badge: 'bg-pink-100 text-pink-700',    dot: 'bg-pink-400'    },
  criancas: { label: 'Crianças/Adolesc.', sublabel: '1 a 15 anos', icon: GraduationCap, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  adultos:  { label: 'Adultos',           sublabel: '+15 anos',    icon: UserCheck,     bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400'    },
};

export const PRIORITY = {
  alta:  { label: 'Alta',  color: 'bg-red-100 text-red-700',     dot: 'bg-red-400',   icon: AlertTriangle },
  media: { label: 'Média', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', icon: Clock         },
  baixa: { label: 'Baixa', color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300', icon: TrendingDown  },
};

const FUNIL_STATUS = {
  novo:               { label: 'Novo',                color: 'bg-slate-100 text-slate-500',   icon: TrendingDown   },
  tentativa_contato:  { label: 'Em contato',          color: 'bg-blue-100 text-blue-700',     icon: PhoneCall      },
  agendado_novo_teste:{ label: 'Agendado',            color: 'bg-green-100 text-green-700',   icon: CalendarCheck  },
  perdido_definitivo: { label: 'Perdido definitivo',  color: 'bg-red-100 text-red-700',       icon: XCircle        },
};

function MessageTypePicker({ onSelect, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-1.5 z-20 bg-white rounded-xl border border-slate-200 shadow-lg p-2 w-56" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500">Tipo de mensagem</p>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X className="h-3.5 w-3.5" /></button>
      </div>
      <button
        onClick={() => onSelect('padrao')}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#6B3FA0]/5 transition-colors text-left"
      >
        <MessageSquare className="h-4 w-4 text-[#6B3FA0] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-700">Padrão</p>
          <p className="text-[11px] text-slate-400 leading-tight">Mensagem individual personalizada</p>
        </div>
      </button>
      <button
        onClick={() => onSelect('campanha')}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-orange-50 transition-colors text-left"
      >
        <Megaphone className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-700">Campanha</p>
          <p className="text-[11px] text-slate-400 leading-tight">Mensagem de disparo em massa</p>
        </div>
      </button>
    </div>
  );
}

export default function ClientRowFunil({ item, onWhatsApp, onUpdated }) {
  const [expanded, setExpanded]       = useState(false);
  const [showPicker, setShowPicker]   = useState(false);
  const [savingNote, setSavingNote]   = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [localNote, setLocalNote]     = useState(item.funil_notes || '');
  const [localStatus, setLocalStatus] = useState(item.funil_status || 'novo');

  const group     = AGE_GROUPS[item.age_group?.key] || AGE_GROUPS.adultos;
  const prio      = PRIORITY[item.priority]          || PRIORITY.baixa;
  const funilCfg  = FUNIL_STATUS[localStatus]         || FUNIL_STATUS.novo;
  const PrioIcon  = prio.icon;
  const GroupIcon = group.icon;
  const FunilIcon = funilCfg.icon;

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await base44.entities.Client.update(item.client_id, { funil_notes: localNote });
      onUpdated && onUpdated(item.client_id, { funil_notes: localNote });
    } catch (e) { console.error(e); }
    setSavingNote(false);
  };

  const changeStatus = async (newStatus) => {
    setSavingStatus(true);
    setLocalStatus(newStatus);
    try {
      await base44.entities.Client.update(item.client_id, { funil_status: newStatus });
      onUpdated && onUpdated(item.client_id, { funil_status: newStatus });
    } catch (e) { setLocalStatus(item.funil_status || 'novo'); console.error(e); }
    setSavingStatus(false);
  };

  const lastContact = item.funil_last_contact
    ? new Date(item.funil_last_contact + 'T12:00:00').toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:border-slate-200 transition-colors">
      {/* Row principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${group.badge}`}>
          <GroupIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm leading-tight">{item.client_name}</p>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${group.badge}`}>{group.label}</span>
            {/* Status do funil */}
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${funilCfg.color}`}>
              {savingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <FunilIcon className="h-3 w-3" />}
              {funilCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${prio.color}`}>
              <PrioIcon className="h-3 w-3" />
              {prio.label}
            </span>
            <span className="text-xs text-slate-400">
              Teste finalizado {item.days_since_test === 0 ? 'hoje' : item.days_since_test === 1 ? '1 dia atrás' : `${item.days_since_test} dias atrás`}
            </span>
            {lastContact && (
              <span className="text-xs text-slate-400">· Último contato: {lastContact}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {item.client_phone && (
            <div className="relative">
              <button
                onClick={() => setShowPicker(p => !p)}
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
              {showPicker && (
                <MessageTypePicker
                  onSelect={type => { setShowPicker(false); onWhatsApp(item, type); }}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </div>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Detalhe expandido */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-4">

          {/* Infos básicas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Telefone</p>
              <p className="text-slate-700 font-medium">{item.client_phone || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Profissional</p>
              <p className="text-slate-700 font-medium">{item.responsible_professional || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-medium mb-0.5">Data do teste</p>
              <p className="text-slate-700 font-medium">
                {item.last_test_end_date
                  ? new Date(item.last_test_end_date + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'}
              </p>
            </div>
          </div>

          {/* Aparelhos testados */}
          {item.last_test_devices?.filter(d => d.product_name)?.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Aparelhos testados</p>
              <div className="flex flex-wrap gap-1.5">
                {item.last_test_devices.filter(d => d.product_name).map((d, i) => (
                  <span key={i} className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 font-medium flex items-center gap-1">
                    <Stethoscope className="h-3 w-3 text-slate-400" />
                    {d.product_name}
                    {d.serial_number && <span className="text-slate-300">· {d.serial_number}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Controle do Funil ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status do Funil</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(FUNIL_STATUS).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const isActive = localStatus === key;
                return (
                  <button
                    key={key}
                    disabled={savingStatus}
                    onClick={() => changeStatus(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all
                      ${isActive
                        ? `${cfg.color} border-current shadow-sm`
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                      }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {cfg.label}
                    {isActive && <CheckCircle2 className="h-3 w-3 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Anotações de gestão ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Anotações de Gestão</p>
            <Textarea
              value={localNote}
              onChange={e => setLocalNote(e.target.value)}
              placeholder="Ex: Cliente pediu para ligar novamente em agosto, prefere aparelho com bluetooth..."
              rows={3}
              className="text-xs rounded-lg resize-none border-slate-200"
            />
            <div className="flex justify-end">
              <button
                onClick={saveNote}
                disabled={savingNote || localNote === (item.funil_notes || '')}
                className="flex items-center gap-1.5 bg-[#6B3FA0] hover:bg-[#5a3490] disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar anotação
              </button>
            </div>
            {item.funil_notes && localNote === item.funil_notes && (
              <p className="text-[11px] text-slate-400 italic truncate">"{item.funil_notes}"</p>
            )}
          </div>

          {/* ── Botões de mensagem ── */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onWhatsApp(item, 'padrao')}
              disabled={!item.client_phone}
              className="flex items-center gap-2 bg-[#6B3FA0] hover:bg-[#5a3490] disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Msg. Padrão
            </button>
            <button
              onClick={() => onWhatsApp(item, 'campanha')}
              disabled={!item.client_phone}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Msg. Campanha
            </button>
          </div>
        </div>
      )}
    </div>
  );
}