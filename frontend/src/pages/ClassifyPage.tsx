import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormInput, MessageSquare } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { FractureForm } from '../components/FractureForm';
import { ChatPanel } from '../components/ChatPanel';
import { FlowDiagramSidebar } from '../components/FlowDiagramSidebar';

type InputMode = 'form' | 'chat';

export function ClassifyPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<InputMode>('form');

  return (
    <div className="h-full">
      {/* Mode Toggle */}
      <div className="px-4 pt-6">
        <div className="flex justify-center">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(value) => value && setMode(value as InputMode)}
            className="bg-muted p-1 rounded-lg"
          >
            <ToggleGroupItem
              value="form"
              aria-label={t('classify.modeForm')}
              className="gap-2 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <FormInput className="h-4 w-4" />
              {t('classify.modeForm')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="chat"
              aria-label={t('classify.modeChat')}
              className="gap-2 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <MessageSquare className="h-4 w-4" />
              {t('classify.modeChat')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Content Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          {mode === 'form' ? <FractureForm /> : <ChatPanel />}
        </div>
      </section>

      {/* Flow Diagram Sidebar - only show for form mode */}
      {mode === 'form' && <FlowDiagramSidebar />}
    </div>
  );
}
