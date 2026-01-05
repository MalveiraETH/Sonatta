import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AuditLog() {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const auditLogsData = await base44.entities.AuditLog.list('-created_date', 200);
      
      const logs = auditLogsData.map(log => ({
        entity: log.entity_type,
        action: log.action === 'criacao' ? 'Criação' : 
                log.action === 'edicao' ? 'Edição' : 
                log.action === 'exclusao' ? 'Exclusão' : 'WhatsApp',
        description: log.description,
        user: log.created_by,
        date: log.created_date
      }));

      setAuditLogs(logs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const term = searchTerm.toLowerCase();
    return (
      log.entity.toLowerCase().includes(term) ||
      log.description.toLowerCase().includes(term) ||
      log.user.toLowerCase().includes(term)
    );
  });

  const actionColors = {
    'Criação': 'bg-emerald-100 text-emerald-700',
    'Edição': 'bg-blue-100 text-blue-700',
    'Exclusão': 'bg-red-100 text-red-700',
    'WhatsApp': 'bg-green-100 text-green-700'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B3FA0]" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#6B3FA0]" />
            <CardTitle>Auditoria do Sistema</CardTitle>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Data/Hora</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">
                      {format(new Date(log.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{log.entity}</TableCell>
                    <TableCell>
                      <Badge className={actionColors[log.action]}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                    <TableCell className="text-sm text-slate-600">{log.user}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-slate-500 text-center">
          Total: {filteredLogs.length} registros
        </div>
      </CardContent>
    </Card>
  );
}