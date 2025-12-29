import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkingHours() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingHours, setWorkingHours] = useState({
    monday: { enabled: true, start: '08:00', end: '18:00' },
    tuesday: { enabled: true, start: '08:00', end: '18:00' },
    wednesday: { enabled: true, start: '08:00', end: '18:00' },
    thursday: { enabled: true, start: '08:00', end: '18:00' },
    friday: { enabled: true, start: '08:00', end: '18:00' },
    saturday: { enabled: false, start: '08:00', end: '12:00' },
    sunday: { enabled: false, start: '08:00', end: '12:00' }
  });

  useEffect(() => {
    loadWorkingHours();
  }, []);

  const loadWorkingHours = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (user.working_hours) {
        setWorkingHours(user.working_hours);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ working_hours: workingHours });
      toast.success('Horário de atendimento salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar horário de atendimento');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const dayLabels = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
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
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#6B3FA0]" />
          <CardTitle>Horário de Atendimento</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(dayLabels).map(([day, label]) => (
          <div key={day} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3 md:w-48">
              <Switch
                checked={workingHours[day].enabled}
                onCheckedChange={(checked) => updateDay(day, 'enabled', checked)}
              />
              <Label className="font-medium">{label}</Label>
            </div>
            
            {workingHours[day].enabled && (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-slate-500">Início:</Label>
                  <Input
                    type="time"
                    value={workingHours[day].start}
                    onChange={(e) => updateDay(day, 'start', e.target.value)}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-slate-500">Fim:</Label>
                  <Input
                    type="time"
                    value={workingHours[day].end}
                    onChange={(e) => updateDay(day, 'end', e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#6B3FA0] hover:bg-[#834CB8]"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Horários
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}