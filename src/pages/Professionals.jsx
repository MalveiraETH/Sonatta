import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTenant, tenantFilter } from '@/lib/useTenant';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/ui/PageHeader';
import ProfessionalForm from '@/components/professionals/ProfessionalForm';
import { Search, MoreHorizontal, Edit, Trash2, MessageCircle, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

export default function Professionals() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!tenantLoading) loadData();
  }, [tenantLoading, tenantId]);

  const loadData = async () => {
    try {
      const filter = tenantFilter(tenantId);
      const [profData, user] = await Promise.all([
        base44.entities.Professional.filter(filter),
        base44.auth.me()
      ]);
      setProfessionals(profData);
      setCurrentUser(user);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfessionals = professionals.filter(prof => {
    const term = searchTerm.toLowerCase();
    return (
      prof.full_name?.toLowerCase().includes(term) ||
      prof.cpf?.toLowerCase().includes(term) ||
      prof.specialty?.toLowerCase().includes(term) ||
      prof.council_number?.toLowerCase().includes(term)
    );
  });

  const handleEdit = (professional) => {
    setSelectedProfessional(professional);
    setFormOpen(true);
  };

  const handleDelete = async (professional) => {
    if (!confirm(`Tem certeza que deseja excluir ${professional.full_name}?`)) return;
    
    if (currentUser?.user_role !== 'admin') {
      toast.error('Apenas administradores podem excluir registros');
      return;
    }

    try {
      await base44.entities.Professional.delete(professional.id);
      toast.success('Profissional excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir profissional');
    }
  };

  const sendWhatsApp = (professional) => {
    const phone = professional.whatsapp?.replace(/\D/g, '');
    if (phone) {
      window.open(`https://wa.me/55${phone}`, '_blank');
    }
  };

  const specialtyLabels = {
    pediatra: 'Pediatra',
    neuropediatra: 'Neuropediatra',
    otorrinolaringologista: 'Otorrinolaringologista',
    otologista: 'Otologista',
    fonoaudiologo: 'Fonoaudiólogo(a)'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profissionais"
        description={`${professionals.length} profissionais cadastrados`}
        action={() => {
          setSelectedProfessional(null);
          setFormOpen(true);
        }}
        actionLabel="Novo Profissional"
        actionIcon={Stethoscope}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {Object.entries(specialtyLabels).map(([key, label]) => {
          const count = professionals.filter(p => p.specialty === key).length;
          return (
            <Card key={key} className="p-4 border-0 shadow-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#1e3a5f]">{count}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, CPF, especialidade ou conselho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead className="hidden md:table-cell">Conselho</TableHead>
                <TableHead className="hidden lg:table-cell">WhatsApp</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfessionals.length > 0 ? (
                filteredProfessionals.map((professional) => (
                  <TableRow key={professional.id} className="hover:bg-slate-50">
                    <TableCell>
                      <p className="font-medium text-slate-800">{professional.full_name}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600">
                      {professional.cpf}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#c9a227]/10 text-[#c9a227]">
                        {specialtyLabels[professional.specialty]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600">
                      {professional.council_number}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-600">
                      {professional.whatsapp}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => sendWhatsApp(professional)}>
                            <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(professional)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {currentUser?.user_role === 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(professional)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum profissional encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ProfessionalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        professional={selectedProfessional}
        onSuccess={loadData}
      />
    </div>
  );
}