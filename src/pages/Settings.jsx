import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '@/components/ui/PageHeader';
import { Settings as SettingsIcon, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      if (user.working_hours) {
        setWorkingHours(user.working_hours);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveWorkingHours = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({ working_hours: workingHours });
      toast.success('Horários de atendimento salvos!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  const updateDay = (day, field, value) => {
    setWorkingHours({
      ...workingHours,
      [day]: {
        ...workingHours[day],
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações do sistema"
        actionIcon={SettingsIcon}
      />

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#6B3FA0]" />
            Horários de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(daysOfWeek).map(([dayKey, dayLabel]) => (
            <div key={dayKey} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 w-40">
                <Checkbox
                  checked={workingHours[dayKey].enabled}
                  onCheckedChange={(checked) => updateDay(dayKey, 'enabled', checked)}
                />
                <Label className="cursor-pointer">{dayLabel}</Label>
              </div>
              
              {workingHours[dayKey].enabled && (
                <div className="flex items-center gap-3 flex-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Início</Label>
                    <Input
                      type="time"
                      value={workingHours[dayKey].start}
                      onChange={(e) => updateDay(dayKey, 'start', e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <span className="text-slate-400 mt-6">até</span>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Fim</Label>
                    <Input
                      type="time"
                      value={workingHours[dayKey].end}
                      onChange={(e) => updateDay(dayKey, 'end', e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSaveWorkingHours}
              disabled={loading}
              className="bg-[#A4D233] hover:bg-[#B8E047] text-slate-900 font-semibold"
            >
              {loading ? 'Salvando...' : 'Salvar Horários'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}