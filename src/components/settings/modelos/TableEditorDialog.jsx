import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Minus, Plus } from 'lucide-react';
import { MAX_TABLE_COLS, MAX_TABLE_ROWS, emptyTable, parseTableValue } from '@/lib/docTable';

export default function TableEditorDialog({ open, data, onOpenChange, onConfirm }) {
  const [draft, setDraft] = useState(emptyTable());

  useEffect(() => {
    if (open) setDraft(parseTableValue(data));
  }, [open, data]);

  const rows = draft.rows;
  const cols = rows[0]?.length || 1;

  const setCell = (rowIndex, colIndex, value) => {
    setDraft((prev) => {
      const next = prev.rows.map((row) => [...row]);
      next[rowIndex][colIndex] = value;
      return { ...prev, rows: next };
    });
  };

  const addRow = () => {
    setDraft((prev) => {
      if (prev.rows.length >= MAX_TABLE_ROWS) return prev;
      const width = prev.rows[0]?.length || 1;
      return {
        ...prev,
        rows: [...prev.rows.map((row) => [...row]), Array(width).fill('')],
      };
    });
  };

  const removeRow = () => {
    setDraft((prev) =>
      prev.rows.length <= 1
        ? prev
        : { ...prev, rows: prev.rows.slice(0, -1).map((row) => [...row]) }
    );
  };

  const addCol = () => {
    setDraft((prev) => {
      const width = prev.rows[0]?.length || 1;
      if (width >= MAX_TABLE_COLS) return prev;
      return { ...prev, rows: prev.rows.map((row) => [...row, '']) };
    });
  };

  const removeCol = () => {
    setDraft((prev) => {
      const width = prev.rows[0]?.length || 1;
      if (width <= 1) return prev;
      return { ...prev, rows: prev.rows.map((row) => row.slice(0, -1)) };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tabela</DialogTitle>
          <DialogDescription>
            Monte as linhas e as colunas e escreva o conteúdo de cada célula.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.header}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, header: checked }))}
            />
            <span className="text-sm text-slate-600">Primeira linha como cabeçalho</span>
          </div>

          <div className="overflow-x-auto">
            <div className="space-y-2 w-max min-w-full">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2">
                  {row.map((cellValue, colIndex) => (
                    <Input
                      key={colIndex}
                      value={cellValue}
                      onChange={(e) => setCell(rowIndex, colIndex, e.target.value)}
                      className="h-8 w-40 text-sm"
                      placeholder={rowIndex === 0 && draft.header ? 'Cabeçalho' : 'Célula'}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={rows.length >= MAX_TABLE_ROWS}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Linha
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={removeRow}
              disabled={rows.length <= 1}
            >
              <Minus className="h-3.5 w-3.5 mr-1" /> Linha
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCol}
              disabled={cols >= MAX_TABLE_COLS}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Coluna
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={removeCol}
              disabled={cols <= 1}
            >
              <Minus className="h-3.5 w-3.5 mr-1" /> Coluna
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-[#6B3FA0] hover:bg-[#834CB8]"
            onClick={() => onConfirm(draft)}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}