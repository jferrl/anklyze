import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Trash2, Loader2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { caseApi } from '@/services';
import type { CaseWithImages, SetGoldStandardRequest, ClassificationResult } from '@/types';

const DANIS_WEBER_OPTIONS = [
  { value: 'Weber A', label: 'Weber A' },
  { value: 'Weber B', label: 'Weber B' },
  { value: 'Weber C', label: 'Weber C' },
  { value: 'not_classifiable', label: 'Not classifiable' },
];

const LAUGE_HANSEN_OPTIONS = [
  { value: 'SA', label: 'SA (Supination-Adduction)' },
  { value: 'SER', label: 'SER (Supination-External Rotation)' },
  { value: 'PER', label: 'PER (Pronation-External Rotation)' },
  { value: 'PA', label: 'PA (Pronation-Abduction)' },
  { value: 'not_classifiable', label: 'Not classifiable' },
];

const AOOTA_OPTIONS = [
  { group: 'A (Infrasyndesmotic)', items: [
    { value: '44-A1', label: '44-A1' }, { value: '44-A1.2', label: '44-A1.2' }, { value: '44-A1.3', label: '44-A1.3' },
    { value: '44-A2', label: '44-A2' }, { value: '44-A2.2', label: '44-A2.2' }, { value: '44-A2.3', label: '44-A2.3' },
    { value: '44-A3', label: '44-A3' }, { value: '44-A3.2', label: '44-A3.2' }, { value: '44-A3.3', label: '44-A3.3' },
  ]},
  { group: 'B (Transyndesmotic)', items: [
    { value: '44-B', label: '44-B' },
    { value: '44-B1', label: '44-B1' }, { value: '44-B1.1', label: '44-B1.1' }, { value: '44-B1.2', label: '44-B1.2' }, { value: '44-B1.3', label: '44-B1.3' },
    { value: '44-B2', label: '44-B2' }, { value: '44-B2.1', label: '44-B2.1' }, { value: '44-B2.2', label: '44-B2.2' }, { value: '44-B2.3', label: '44-B2.3' },
    { value: '44-B3', label: '44-B3' }, { value: '44-B3.1', label: '44-B3.1' }, { value: '44-B3.2', label: '44-B3.2' }, { value: '44-B3.3', label: '44-B3.3' },
  ]},
  { group: 'C (Suprasyndesmotic)', items: [
    { value: '44-C1', label: '44-C1' }, { value: '44-C1.1', label: '44-C1.1' }, { value: '44-C1.2', label: '44-C1.2' }, { value: '44-C1.3', label: '44-C1.3' },
    { value: '44-C2', label: '44-C2' }, { value: '44-C2.1', label: '44-C2.1' }, { value: '44-C2.2', label: '44-C2.2' }, { value: '44-C2.3', label: '44-C2.3' },
    { value: '44-C3', label: '44-C3' }, { value: '44-C3.1', label: '44-C3.1' }, { value: '44-C3.2', label: '44-C3.2' }, { value: '44-C3.3', label: '44-C3.3' },
  ]},
  { group: 'Distal Tibia', items: [
    { value: '43-B1', label: '43-B1' }, { value: '43-B2', label: '43-B2' },
  ]},
  { group: 'Other', items: [
    { value: 'not_classifiable', label: 'Not classifiable' },
  ]},
];

const BARTONICEK_OPTIONS = [
  { value: 'Bartonicek 1', label: 'Bartonicek 1 (Extraincisural)' },
  { value: 'Bartonicek 2', label: 'Bartonicek 2 (Posterolateral)' },
  { value: 'Bartonicek 3', label: 'Bartonicek 3 (Posteromedial two-part)' },
  { value: 'Bartonicek 4', label: 'Bartonicek 4 (Large triangular)' },
  { value: 'not_classifiable', label: 'Not classifiable' },
  { value: 'no_posterior_fracture', label: 'No posterior malleolus fracture' },
];

const NONE_VALUE = '__none__';

interface CaseGoldStandardCardProps {
  caseData: CaseWithImages;
}

export function CaseGoldStandardCard({ caseData }: CaseGoldStandardCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const gold = caseData.gold_standard as ClassificationResult | undefined;
  const hasGold = !!gold;

  const [dw, setDw] = useState(gold?.danis_weber?.type ?? '');
  const [lh, setLh] = useState(gold?.lauge_hansen?.type ?? '');
  const [ao, setAo] = useState(gold?.ao_ota?.code ?? '');
  const [bt, setBt] = useState(gold?.bartonicek?.type ?? '');
  const [impossible, setImpossible] = useState(gold?.impossible ?? false);

  // Track if form changed from saved state
  const savedDw = gold?.danis_weber?.type ?? '';
  const savedLh = gold?.lauge_hansen?.type ?? '';
  const savedAo = gold?.ao_ota?.code ?? '';
  const savedBt = gold?.bartonicek?.type ?? '';
  const savedImpossible = gold?.impossible ?? false;
  const hasChanges = dw !== savedDw || lh !== savedLh || ao !== savedAo || bt !== savedBt || impossible !== savedImpossible;
  const hasAnyValue = dw || lh || ao || bt || impossible;

  const saveMutation = useMutation({
    mutationFn: (data: SetGoldStandardRequest) => caseApi.setGoldStandard(caseData.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => caseApi.deleteGoldStandard(caseData.id),
    onSuccess: () => {
      setDw(''); setLh(''); setAo(''); setBt(''); setImpossible(false);
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] });
    },
  });

  const handleSave = () => {
    const req: SetGoldStandardRequest = {};
    if (dw) req.danis_weber = dw;
    if (lh) req.lauge_hansen = lh;
    if (ao) req.ao_ota = ao;
    if (bt) req.bartonicek = bt;
    if (impossible) req.impossible = true;
    saveMutation.mutate(req);
  };

  const isSaving = saveMutation.isPending || clearMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Gold Standard</CardTitle>
              <CardDescription>{t('admin.reliability.accuracyDescription')}</CardDescription>
            </div>
          </div>
          {hasGold && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
              <Check className="w-3 h-3 mr-1" />
              {t('admin.reliability.goldStandardSet')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Impossible toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Switch id="impossible" checked={impossible} onCheckedChange={setImpossible} />
          <Label htmlFor="impossible" className="text-sm font-medium cursor-pointer">
            {t('classification.impossible', 'Not classifiable (impossible)')}
          </Label>
        </div>

        {/* Classification dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Danis-Weber */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Danis-Weber</Label>
            <Select value={dw || NONE_VALUE} onValueChange={v => setDw(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>-</SelectItem>
                {DANIS_WEBER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lauge-Hansen */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Lauge-Hansen</Label>
            <Select value={lh || NONE_VALUE} onValueChange={v => setLh(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>-</SelectItem>
                {LAUGE_HANSEN_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AO/OTA */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">AO/OTA</Label>
            <Select value={ao || NONE_VALUE} onValueChange={v => setAo(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>-</SelectItem>
                {AOOTA_OPTIONS.map(group => (
                  <div key={group.group}>
                    <div className="py-1.5 pl-3 pr-2 text-xs font-semibold text-muted-foreground">{group.group}</div>
                    {group.items.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bartonicek */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Bartonicek</Label>
            <Select value={bt || NONE_VALUE} onValueChange={v => setBt(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>-</SelectItem>
                {BARTONICEK_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {hasGold && (
              <Button variant="ghost" size="sm" onClick={() => clearMutation.mutate()} disabled={isSaving}
                className="text-destructive hover:text-destructive gap-1.5">
                <Trash2 className="w-4 h-4" />
                {t('admin.reliability.clearGoldStandard')}
              </Button>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving || (!hasChanges && hasGold) || !hasAnyValue}
            size="sm" className="gap-1.5">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {hasGold ? t('common.save') : t('admin.reliability.setGoldStandard')}
          </Button>
        </div>

        {saveMutation.isSuccess && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{t('admin.reliability.goldStandardSet')}</p>
        )}
      </CardContent>
    </Card>
  );
}
