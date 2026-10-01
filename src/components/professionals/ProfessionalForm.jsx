import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { maskCPF, maskPhone, documentError } from '@/lib/masks';
import FieldError from '@/components/ui/FieldError';

export default function ProfessionalForm({ open, onOpenChange, professional, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    whatsapp: '',
    specialty: 'pediatra',
    council_number: ''
  });

  useEffect(() => {
    if (professional) {
      setFormData({
        full_name: professional.full_name || '',
        cpf: professional.cpf || '',
        whatsapp: professional.whatsapp || '',
        specialty: professional.specialty || 'pediatra',
        council_number: professional.council_number || ''
      });
    } else {
      setFormData({
        full_name: '',
        cpf: '',
        whatsapp: '',
        specialty: 'pediatra',
        council_number: ''
      });
    }
    setErrors({});
  }, [professional, open]);

  const validateCpf = () => {
    setErrors({ cpf: documentError(formData.cpf, { kind: 'cpf', original: professional?.cpf }) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.whatsapp || !formData.specialty) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const cpfErro = documentError(formData.cpf, { kind: 'cpf', original: professional?.cpf });
    if (cpfErro) {
      setErrors({ cpf: cpfErro });
      toast.error('Confira os campos destacados antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      if (professional) {
        await base44.entities.Professional.update(professional.id, formData);
        toast.success('Profissional atualizado!');
      } else {
        await base44.entities.Professional.create(formData);
        toast.success('Profissional cadastrado!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar profissional');
    } finally {
      setLoading(false);
    }
  };

  const specialtyLabels = {
    pediatra: 'Pediatra',
    neuropediatra: 'Neuropediatra',
    otorrinolaringologista: 'Otorrinolaringologista',
    otologista: 'Otologista',
    fonoaudiologo: 'Fonoaudiólogo(a)'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {professional ? 'Editar Profissional' : 'Novo Profissional'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nome completo do profissional"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={formData.cpf}
                onChange={(e) => {
                  setFormData({ ...formData, cpf: maskCPF(e.target.value) });
                  setErrors({});
                }}
                onBlur={validateCpf}
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
                className={errors.cpf ? 'border-red-400' : ''}
              />
              <FieldError message={errors.cpf} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: maskPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Especialidade *</Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) => setFormData({ ...formData, specialty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(specialtyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nº Conselho</Label>
              <Input
                value={formData.council_number}
                onChange={(e) => setFormData({ ...formData, council_number: e.target.value })}
                placeholder="CRM, CRFa, etc"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {professional ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}