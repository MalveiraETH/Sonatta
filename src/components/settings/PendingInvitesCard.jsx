import React from 'react';
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Send, X } from 'lucide-react';

const roleLabels = {
  admin: 'Administrador',
  fonoaudiologo: 'Fonoaudiólogo(a)',
  comercial: 'Consultor Comercial',
  recepcao: 'Recepção',
  user: 'Usuário',
};

const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  fonoaudiologo: 'bg-blue-100 text-blue-700',
  comercial: 'bg-emerald-100 text-emerald-700',
  recepcao: 'bg-amber-100 text-amber-700',
  user: 'bg-slate-100 text-slate-700',
};

export default function PendingInvitesCard({ invites, onResend, onCancel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-[#6B3FA0]" />
          Convites pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum convite pendente. Ao convidar alguém, o convite fica listado aqui até a pessoa entrar no sistema.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Convite</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <p className="font-medium">{invite.full_name || invite.email}</p>
                    <p className="text-xs text-slate-500">{invite.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[invite.role] || roleColors.user}`}>
                      {roleLabels[invite.role] || invite.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {invite.invited_at ? moment(invite.invited_at).format('DD/MM/YYYY HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => onResend(invite)} className="gap-1">
                        <Send className="h-3.5 w-3.5" />
                        Reenviar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(invite)}
                        className="text-red-600 hover:text-red-700 gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}