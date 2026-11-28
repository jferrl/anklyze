import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';

type Tab = 'anatomy' | 'fracture';

/**
 * AnatomyTabs shows the tinted anatomy figure or the simulated fracture, one at a time, so the
 * answer path stays in view. Both stay mounted: a figure keeps its camera, and a hidden one costs
 * nothing. It turns to the fracture once the form is complete, when the fracture no longer hints at
 * an answer.
 */
export function AnatomyTabs({ anatomy, fracture, complete }: { anatomy: ReactNode; fracture: ReactNode; complete: boolean }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>(complete ? 'fracture' : 'anatomy');
  // Switched during render when the form becomes complete, so the anatomy tab never flashes.
  const [wasComplete, setWasComplete] = useState(complete);
  if (complete !== wasComplete) {
    setWasComplete(complete);
    if (complete) setTab('fracture');
  }
  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="anatomy">{t('anatomy.title')}</TabsTrigger>
        <TabsTrigger value="fracture">{t('anatomy.fractureTitle')}</TabsTrigger>
      </TabsList>
      <TabsContent value="anatomy" forceMount className="mt-3 data-[state=inactive]:hidden">
        {anatomy}
      </TabsContent>
      <TabsContent value="fracture" forceMount className="mt-3 data-[state=inactive]:hidden">
        {fracture}
      </TabsContent>
    </Tabs>
  );
}
