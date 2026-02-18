import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { CaseResponse } from '@/types';

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
                      {response.classification.danis_weber.type}
                    </div>
                  )}
                  {response.classification.lauge_hansen && (
                    <div>
                      <span className="font-medium">Lauge-Hansen:</span>{' '}
                      {response.classification.lauge_hansen.type}
                    </div>
                  )}
                  {response.classification.ao_ota && (
                    <div>
                      <span className="font-medium">AO/OTA:</span>{' '}
                      {response.classification.ao_ota.code}
                    </div>
                  )}
                  {response.classification.bartonicek && (
                    <div>
                      <span className="font-medium">Bartonicek:</span>{' '}
                      {response.classification.bartonicek.type}
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
