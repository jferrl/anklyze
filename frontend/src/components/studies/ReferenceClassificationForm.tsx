import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Check } from 'lucide-react';
import type { ClassificationResult } from '../../types/fracture';

// Special value for not classifiable
const NOT_CLASSIFIABLE = 'NOT_CLASSIFIABLE';

// Classification option values (labels come from translations)
const DANIS_WEBER_VALUES = ['A', 'B', 'C', NOT_CLASSIFIABLE];
const LAUGE_HANSEN_VALUES = ['SA', 'SER', 'PA', 'PER', NOT_CLASSIFIABLE];
const AO_OTA_VALUES = ['44-A1', '44-A2', '44-A3', '44-B1', '44-B2', '44-B3', '44-C1', '44-C2', '44-C3', NOT_CLASSIFIABLE];
const BARTONICEK_VALUES = ['1', '2', '3', '4', NOT_CLASSIFIABLE];

interface ReferenceClassificationFormProps {
  initialValue?: ClassificationResult;
  onSave: (result: ClassificationResult) => void;
  onCancel: () => void;
}

export function ReferenceClassificationForm({
  initialValue,
  onSave,
  onCancel,
}: ReferenceClassificationFormProps) {
  const { t } = useTranslation();

  // Toggle states for each system
  const [includeDanisWeber, setIncludeDanisWeber] = useState(!!initialValue?.danis_weber);
  const [includeLaugeHansen, setIncludeLaugeHansen] = useState(!!initialValue?.lauge_hansen);
  const [includeAoOta, setIncludeAoOta] = useState(!!initialValue?.ao_ota);
  const [includeBartonicek, setIncludeBartonicek] = useState(!!initialValue?.bartonicek);

  // Helper to parse initial values
  const parseInitialValue = (value: string | undefined, isBartonicek = false): string => {
    if (!value) return '';
    if (value === 'Not classifiable') return NOT_CLASSIFIABLE;
    if (isBartonicek) return value.replace('Type ', '');
    return value;
  };

  // Selected values
  const [danisWeber, setDanisWeber] = useState(parseInitialValue(initialValue?.danis_weber?.type));
  const [laugeHansen, setLaugeHansen] = useState(parseInitialValue(initialValue?.lauge_hansen?.type));
  const [aoOta, setAoOta] = useState(parseInitialValue(initialValue?.ao_ota?.code));
  const [bartonicek, setBartonicek] = useState(parseInitialValue(initialValue?.bartonicek?.type, true));

  // Helper functions to get translated labels and descriptions
  const getDanisWeberLabel = (value: string) => {
    if (value === NOT_CLASSIFIABLE) return t('admin.studies.notClassifiable');
    return t(`admin.studies.classifications.danisWeber.${value}`);
  };
  const getDanisWeberDesc = (value: string) => {
    if (value === NOT_CLASSIFIABLE) return t('admin.studies.notClassifiableDesc');
    return t(`admin.studies.classifications.danisWeber.${value}Desc`);
  };

  const getLaugeHansenLabel = (value: string) => {
    if (value === NOT_CLASSIFIABLE) return t('admin.studies.notClassifiable');
    return t(`admin.studies.classifications.laugeHansen.${value}`);
  };
  const getLaugeHansenDesc = (value: string) => {
    if (value === NOT_CLASSIFIABLE) return t('admin.studies.notClassifiableDesc');
    return t(`admin.studies.classifications.laugeHansen.${value}Desc`);
  };

  const getAoOtaLabel = (value: string) => {
    if (value === NOT_CLASSIFIABLE) return t('admin.studies.notClassifiable');
    return t(`admin.studies.classifications.aoOta.${value}`);
  };
  const getAoOtaDesc = (value: string) => {
    if (value === NOT_CLASSIFIABLE) return t('admin.studies.notClassifiableDesc');
    return t(`admin.studies.classifications.aoOta.${value}Desc`);
  };

  const getBartonicekLabel = (value: string) => {
    if (value === NOT_CLASSIFIABLE) return t('admin.studies.notClassifiable');
    return t(`admin.studies.classifications.bartonicek.${value}`);
  };
  const getBartonicekDesc = (value: string) => {
    if (value === NOT_CLASSIFIABLE) return t('admin.studies.notClassifiableDesc');
    return t(`admin.studies.classifications.bartonicek.${value}Desc`);
  };

  const handleSave = () => {
    const result: ClassificationResult = {
      fracture_description: 'Reference classification',
    };

    if (includeDanisWeber && danisWeber) {
      result.danis_weber = {
        type: danisWeber === NOT_CLASSIFIABLE ? 'Not classifiable' : danisWeber,
        description: getDanisWeberDesc(danisWeber),
      };
    }

    if (includeLaugeHansen && laugeHansen) {
      result.lauge_hansen = {
        type: laugeHansen === NOT_CLASSIFIABLE ? 'Not classifiable' : laugeHansen,
        full_name: getLaugeHansenDesc(laugeHansen),
        description: getLaugeHansenDesc(laugeHansen),
      };
    }

    if (includeAoOta && aoOta) {
      result.ao_ota = {
        code: aoOta === NOT_CLASSIFIABLE ? 'Not classifiable' : aoOta,
        description: getAoOtaDesc(aoOta),
      };
    }

    if (includeBartonicek && bartonicek) {
      result.bartonicek = {
        type: bartonicek === NOT_CLASSIFIABLE ? 'Not classifiable' : `Type ${bartonicek}`,
        description: getBartonicekDesc(bartonicek),
      };
    }

    onSave(result);
  };

  const hasSelection = (includeDanisWeber && danisWeber) ||
    (includeLaugeHansen && laugeHansen) ||
    (includeAoOta && aoOta) ||
    (includeBartonicek && bartonicek);

  return (
    <div className="space-y-6">
      {/* Danis-Weber */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Danis-Weber</Label>
          <Switch
            checked={includeDanisWeber}
            onCheckedChange={setIncludeDanisWeber}
          />
        </div>
        {includeDanisWeber && (
          <Select value={danisWeber} onValueChange={setDanisWeber}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin.studies.selectClassification')} />
            </SelectTrigger>
            <SelectContent>
              {DANIS_WEBER_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{getDanisWeberLabel(value)}</span>
                    <span className="text-xs text-muted-foreground">{getDanisWeberDesc(value)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Lauge-Hansen */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Lauge-Hansen</Label>
          <Switch
            checked={includeLaugeHansen}
            onCheckedChange={setIncludeLaugeHansen}
          />
        </div>
        {includeLaugeHansen && (
          <Select value={laugeHansen} onValueChange={setLaugeHansen}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin.studies.selectClassification')} />
            </SelectTrigger>
            <SelectContent>
              {LAUGE_HANSEN_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{getLaugeHansenLabel(value)}</span>
                    <span className="text-xs text-muted-foreground">{getLaugeHansenDesc(value)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* AO/OTA */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">AO/OTA</Label>
          <Switch
            checked={includeAoOta}
            onCheckedChange={setIncludeAoOta}
          />
        </div>
        {includeAoOta && (
          <Select value={aoOta} onValueChange={setAoOta}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin.studies.selectClassification')} />
            </SelectTrigger>
            <SelectContent>
              {AO_OTA_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{getAoOtaLabel(value)}</span>
                    <span className="text-xs text-muted-foreground">{getAoOtaDesc(value)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Bartonicek */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Bartonicek</Label>
          <Switch
            checked={includeBartonicek}
            onCheckedChange={setIncludeBartonicek}
          />
        </div>
        {includeBartonicek && (
          <Select value={bartonicek} onValueChange={setBartonicek}>
            <SelectTrigger>
              <SelectValue placeholder={t('admin.studies.selectClassification')} />
            </SelectTrigger>
            <SelectContent>
              {BARTONICEK_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{getBartonicekLabel(value)}</span>
                    <span className="text-xs text-muted-foreground">{getBartonicekDesc(value)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={!hasSelection} className="gap-2">
          <Check className="w-4 h-4" />
          {t('admin.studies.saveReference')}
        </Button>
      </div>
    </div>
  );
}
