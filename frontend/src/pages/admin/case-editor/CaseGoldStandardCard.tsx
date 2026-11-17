import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2, Check } from 'lucide-react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { caseApi } from '@/services';
import type { CaseWithImages, SetGoldStandardRequest, ClassificationResult } from '@/types';

const DANIS_WEBER_OPTIONS = ['Weber A', 'Weber B', 'Weber C'];

const LAUGE_HANSEN_OPTIONS = ['SA', 'SER', 'PER', 'PA'];

// Groups are keys of admin.reliability.goldStandardGroups.
const AOOTA_OPTIONS = [
  { group: 'infrasyndesmotic', items: [
    { value: '44-A1', label: '44-A1' }, { value: '44-A1.2', label: '44-A1.2' }, { value: '44-A1.3', label: '44-A1.3' },
    { value: '44-A2', label: '44-A2' }, { value: '44-A2.2', label: '44-A2.2' }, { value: '44-A2.3', label: '44-A2.3' },
    { value: '44-A3', label: '44-A3' }, { value: '44-A3.2', label: '44-A3.2' }, { value: '44-A3.3', label: '44-A3.3' },
  ]},
  { group: 'transyndesmotic', items: [
    { value: '44-B', label: '44-B' },
    { value: '44-B1', label: '44-B1' }, { value: '44-B1.1', label: '44-B1.1' }, { value: '44-B1.2', label: '44-B1.2' }, { value: '44-B1.3', label: '44-B1.3' },
    { value: '44-B2', label: '44-B2' }, { value: '44-B2.1', label: '44-B2.1' }, { value: '44-B2.2', label: '44-B2.2' }, { value: '44-B2.3', label: '44-B2.3' },
    { value: '44-B3', label: '44-B3' }, { value: '44-B3.1', label: '44-B3.1' }, { value: '44-B3.2', label: '44-B3.2' }, { value: '44-B3.3', label: '44-B3.3' },
  ]},
  { group: 'suprasyndesmotic', items: [
    { value: '44-C1', label: '44-C1' }, { value: '44-C1.1', label: '44-C1.1' }, { value: '44-C1.2', label: '44-C1.2' }, { value: '44-C1.3', label: '44-C1.3' },
    { value: '44-C2', label: '44-C2' }, { value: '44-C2.1', label: '44-C2.1' }, { value: '44-C2.2', label: '44-C2.2' }, { value: '44-C2.3', label: '44-C2.3' },
    { value: '44-C3', label: '44-C3' }, { value: '44-C3.1', label: '44-C3.1' }, { value: '44-C3.2', label: '44-C3.2' }, { value: '44-C3.3', label: '44-C3.3' },
  ]},
  { group: 'distalTibia', items: [
    { value: '43-B1', label: '43-B1' }, { value: '43-B2', label: '43-B2' },
  ]},
];

// Each Bartonicek type is described by a form.options.posteriorType key.
const BARTONICEK_OPTIONS = [
  { value: 'Bartonicek 1', descKey: 'extraincisural' },
  { value: 'Bartonicek 2', descKey: 'posterolateral' },
  { value: 'Bartonicek 3', descKey: 'posteromedial_posterolateral' },
  { value: 'Bartonicek 4', descKey: 'large_posterolateral' },
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
        <CardTitle className="text-base">{t('admin.reliability.goldStandard')}</CardTitle>
        <CardDescription>{t('admin.reliability.accuracyDescription')}</CardDescription>
        {hasGold && (
          <CardAction>
            <Badge variant="outline" className="font-normal">
              <Check className="text-success" />
              {t('admin.reliability.goldStandardSet')}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Impossible toggle */}
        <div className="flex items-center gap-3 border-b pb-4">
          <Switch id="impossible" checked={impossible} onCheckedChange={setImpossible} />
          <Label htmlFor="impossible" className="text-sm font-medium cursor-pointer">
            {t('admin.cases.impossibleClassification')}
          </Label>
        </div>

        {/* Classification dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Danis-Weber */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><span className="size-2 bg-sys-dw" />Danis-Weber</Label>
            <Select value={dw || NONE_VALUE} onValueChange={v => setDw(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>-</SelectItem>
                {DANIS_WEBER_OPTIONS.map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
                <SelectItem value="not_classifiable">{t('results.classifications.danisWeber.not_classifiable_name')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lauge-Hansen */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><span className="size-2 bg-sys-lh" />Lauge-Hansen</Label>
            <Select value={lh || NONE_VALUE} onValueChange={v => setLh(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>-</SelectItem>
                {LAUGE_HANSEN_OPTIONS.map(v => (
                  <SelectItem key={v} value={v}>{v} ({t(`results.classifications.laugeHansen.${v}_name`)})</SelectItem>
                ))}
                <SelectItem value="not_classifiable">{t('results.classifications.laugeHansen.not_classifiable_name')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AO/OTA */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><span className="size-2 bg-sys-ao" />AO/OTA</Label>
            <Select value={ao || NONE_VALUE} onValueChange={v => setAo(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>-</SelectItem>
                {AOOTA_OPTIONS.map(group => (
                  <div key={group.group}>
                    <div className="py-1.5 pl-3 pr-2 text-xs font-semibold text-muted-foreground">{t(`admin.reliability.goldStandardGroups.${group.group}`)}</div>
                    {group.items.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </div>
                ))}
                <div className="py-1.5 pl-3 pr-2 text-xs font-semibold text-muted-foreground">{t('admin.reliability.goldStandardGroups.other')}</div>
                <SelectItem value="not_classifiable">{t('results.classifications.aoOta.not_classifiable_name')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bartonicek */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><span className="size-2 bg-sys-bt" />Bartonicek</Label>
            <Select value={bt || NONE_VALUE} onValueChange={v => setBt(v === NONE_VALUE ? '' : v)}>
              <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>-</SelectItem>
                {BARTONICEK_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.value} ({t(`form.options.posteriorType.${o.descKey}`)})</SelectItem>
                ))}
                <SelectItem value="not_classifiable">{t('results.classifications.bartonicek.not_classifiable_name')}</SelectItem>
                <SelectItem value="no_posterior_fracture">{t('results.classifications.bartonicek.reason_no_posterior')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {hasGold && (
              <Button variant="ghost" size="sm" onClick={() => clearMutation.mutate()} disabled={isSaving}
                className="text-destructive hover:text-destructive">
                <Trash2 />
                {t('admin.reliability.clearGoldStandard')}
              </Button>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving || (!hasChanges && hasGold) || !hasAnyValue}
            size="sm">
            {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
            {hasGold ? t('common.save') : t('admin.reliability.setGoldStandard')}
          </Button>
        </div>

        {saveMutation.isSuccess && (
          <p className="text-sm text-success" role="status">{t('admin.reliability.goldStandardSet')}</p>
        )}
      </CardContent>
    </Card>
  );
}
