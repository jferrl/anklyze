import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { CaseResponse } from '@/types';
import {
  getDanisWeberDisplayName,
  getLaugeHansenFullName,
  getAOOTADisplayName,
  getAOOTASubtypeLabel,
  getBartonicekDisplayName,
} from '@/utils/classificationTranslations';

interface PreviousResponsesProps {
  responses: CaseResponse[];
}

export function PreviousResponses({ responses }: PreviousResponsesProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (responses.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            {t('studies.previousResponses')} ({responses.length})
          </span>
          <ChevronRight
            className={`h-5 w-5 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {responses.map((response, index) => (
              <div
                key={response.id}
                className="border rounded-lg p-4 text-sm"
              >
                <div className="text-muted-foreground mb-2">
                  {t('studies.response')} #{responses.length - index} -{' '}
                  {new Date(response.created_at).toLocaleString()}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {response.classification.danis_weber && (
                    <div>
                      <span className="font-medium">Danis-Weber:</span>{' '}
                      {getDanisWeberDisplayName(t, response.classification.danis_weber.type)}
                    </div>
                  )}
                  {response.classification.lauge_hansen && (
                    <div>
                      <span className="font-medium">Lauge-Hansen:</span>{' '}
                      {getLaugeHansenFullName(t, response.classification.lauge_hansen.type)}
                    </div>
                  )}
                  {response.classification.ao_ota && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">AO/OTA:</span>{' '}
                      {getAOOTADisplayName(t, response.classification.ao_ota.code)}
                      {getAOOTASubtypeLabel(t, response.classification.ao_ota.code) && (
                        <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-300 text-[10px]">
                          {getAOOTASubtypeLabel(t, response.classification.ao_ota.code)}
                        </Badge>
                      )}
                    </div>
                  )}
                  {response.classification.bartonicek && (
                    <div>
                      <span className="font-medium">Bartonicek:</span>{' '}
                      {getBartonicekDisplayName(t, response.classification.bartonicek.type, response.classification.fracture_type)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
