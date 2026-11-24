import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { helpGuide } from './helpGuideContent';
import { BookOpen } from 'lucide-react';

function Steps({ intro, steps }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{intro}</p>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#6B3FA0]/10 text-xs font-semibold text-[#6B3FA0]">
              {index + 1}
            </span>
            <span className="text-sm leading-relaxed text-slate-700">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function HelpGuideDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#6B3FA0]">
            <BookOpen className="h-5 w-5" />
            Guia de uso
          </DialogTitle>
          <DialogDescription>
            Passo a passo das principais telas do sistema.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={helpGuide[0].id}>
          <TabsList className="grid w-full grid-cols-3">
            {helpGuide.map((section) => (
              <TabsTrigger key={section.id} value={section.id}>
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {helpGuide.map((section) => (
            <TabsContent key={section.id} value={section.id} className="mt-4">
              <Steps intro={section.intro} steps={section.steps} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}