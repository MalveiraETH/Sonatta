import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, Eye, FileSignature, Loader2, MoreVertical, Trash2 } from 'lucide-react';

export default function ContractActionsMenu({
  contract,
  canDelete,
  busy,
  onView,
  onSendCarne,
  onSendContrato,
  onDelete,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSendCarne(contract)}>
          <BookOpen className="h-4 w-4 mr-2" />
          Enviar carnê
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSendContrato(contract)}>
          <FileSignature className="h-4 w-4 mr-2" />
          Enviar contrato
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onView(contract)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver contrato
        </DropdownMenuItem>
        {canDelete && (
          <DropdownMenuItem onClick={() => onDelete(contract)} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}