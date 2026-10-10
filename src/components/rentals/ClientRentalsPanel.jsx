import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RentalForm from '@/components/rentals/RentalForm';
import RentalDetailsDialog from '@/components/rentals/RentalDetailsDialog';
import CloseRentalDialog from '@/components/rentals/CloseRentalDialog';
import { Plus, Repeat, Loader2 } from 'lucide-react';
import { formatLocalDate } from '@/components/utils/dateHelpers';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const statusStyles = {
  ativa: 'bg-emerald-100 text-emerald-700',
  encerrada: 'bg-slate-100 text-slate-600',
  cancelada: 'bg-red-100 text-red-700'
};

const statusLabels = {
  ativa: 'Ativa',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada'
};

/**
 * Aba de locações na ficha do cliente.
 */
export default function ClientRentalsPanel({ clientId, clientName, clientPhone, onChanged }) {
  const [rentals, setRentals] = useState([]);
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [closeOpen, setCloseOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rentalsPage, chargesPage] = await Promise.all([
        base44.entities.Rental.filter({ client_id: clientId }, { sort: '-created_date', limit: 100 }),
        base44.entities.RentalCharge.filter({ client_id: clientId }, { sort: 'due_date', limit: 200 })
      ]);
      setRentals(rentalsPage.items || []);
      setCharges(chargesPage.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pendingForRental = (rentalId) =>
    charges
      .filter(
        (c) => c.rental_id === rentalId && (c.status === 'pendente' || c.status === 'parcial')
      )
      .reduce((sum, c) => sum + (c.remaining_amount || 0), 0);

  const refresh = () => {
    loadData();
    onChanged?.();
  };

  const client = { id: clientId, full_name: clientName, phone: clientPhone };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-[#6B3FA0]" />
          Locações
        </CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditingRental(null);
            setFormOpen(true);
          }}
          className="bg-[#6B3FA0] hover:bg-[#834CB8]"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova Locação
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : rentals.length === 0 ? (
          <p className="text-center text-slate-500 py-4">
            Nenhuma locação registrada para este cliente
          </p>
        ) : (
          <div className="space-y-3">
            {rentals.map((rental) => {
              const pending = pendingForRental(rental.id);
              return (
                <button
                  key={rental.id}
                  type="button"
                  onClick={() => {
                    setSelectedRental(rental);
                    setDetailsOpen(true);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{rental.rental_number}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            statusStyles[rental.status] || statusStyles.encerrada
                          }`}
                        >
                          {statusLabels[rental.status] || rental.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 truncate">
                        {rental.product_name} · NS {rental.serial_number || '—'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatLocalDate(rental.start_date)}
                        {rental.term_type === 'indeterminado'
                          ? ' · prazo indeterminado'
                          : rental.end_date
                          ? ` até ${formatLocalDate(rental.end_date)}`
                          : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-slate-800">
                        {formatCurrency(rental.monthly_amount)}
                      </p>
                      {pending > 0 && (
                        <p className="text-xs text-amber-600">Em aberto: {formatCurrency(pending)}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      <RentalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        rental={editingRental}
        preselectedClient={editingRental ? null : client}
        onSuccess={refresh}
      />

      <RentalDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        rental={selectedRental}
        onChanged={refresh}
        onEditRental={(rental) => {
          setEditingRental(rental);
          setFormOpen(true);
        }}
        onEndRental={(rental) => {
          setSelectedRental(rental);
          setCloseOpen(true);
        }}
      />

      <CloseRentalDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        rental={selectedRental}
        onClosed={refresh}
      />
    </Card>
  );
}