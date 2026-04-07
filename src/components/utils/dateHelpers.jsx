import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data sem problemas de timezone
 * @param {string} dateString - Data no formato 'yyyy-MM-dd'
 * @param {string} formatStr - Formato de saída (padrão: 'dd/MM/yyyy')
 * @returns {string} Data formatada
 */
export const formatLocalDate = (dateString, formatStr = 'dd/MM/yyyy') => {
  if (!dateString) return '-';
  
  // Adiciona horário local para evitar conversão de timezone
  const dateWithTime = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
  const date = new Date(dateWithTime);
  
  if (isNaN(date.getTime())) return '-';
  
  return format(date, formatStr, { locale: ptBR });
};

/**
 * Converte string de data para objeto Date local
 * @param {string} dateString - Data no formato 'yyyy-MM-dd'
 * @returns {Date} Objeto Date
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const dateWithTime = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
  return new Date(dateWithTime);
};