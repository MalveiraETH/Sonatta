import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CATEGORY_TABS = [
  { value: 'aparelho_auditivo', label: 'Aparelhos' },
  { value: 'carregador', label: 'Carregadores' },
  { value: 'bateria', label: 'Baterias' },
];

const normalize = (s) => (s || '')
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .trim();

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(value || 0);

/**
 * Estoque disponível agrupado por nome do produto, dividido em abas por categoria.
 */
export default function StockByNameCard({ products, allTrialIds }) {
  const available = products.filter(p =>
    !allTrialIds.has(p.id) &&
    (p.stock_type === 'nao_serializado' ? (p.quantity || 0) > 0 : p.status === 'disponivel')
  );

  const groupsForCategory = (category) => {
    const nameGroups = available
      .filter(p => p.category === category)
      .reduce((acc, product) => {
        const key = normalize(product.name);
        if (!acc[key]) {
          acc[key] = {
            name: product.name,
            brand: product.brand,
            quantity: 0,
            price: product.sale_price || 0
          };
        }
        acc[key].quantity += product.stock_type === 'serializado' ? 1 : (product.quantity || 0);
        return acc;
      }, {});

    return Object.values(nameGroups).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  };

  return (
    <Card>
      <div className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-1">Estoque por Nome</h3>
        <p className="text-xs text-slate-500 mb-4">Somente itens disponíveis, agrupados por nome</p>

        <Tabs defaultValue="aparelho_auditivo">
          <TabsList className="h-auto flex-wrap mb-4">
            {CATEGORY_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          {CATEGORY_TABS.map(tab => {
            const rows = groupsForCategory(tab.value);

            return (
              <TabsContent key={tab.value} value={tab.value}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Nome</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-right">Preço Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                            Nenhum item em estoque nesta categoria
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((item, index) => (
                          <TableRow key={index} className="hover:bg-slate-50">
                            <TableCell className="font-medium">{item.name || '-'}</TableCell>
                            <TableCell>{item.brand || '-'}</TableCell>
                            <TableCell className="text-center font-semibold text-[#6B3FA0]">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.price)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </Card>
  );
}