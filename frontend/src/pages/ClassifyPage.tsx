import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormInput, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
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
          <div className="inline-flex rounded-lg border bg-muted p-1">
            <Button
              variant={mode === 'form' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('form')}
              className="gap-2"
            >
              <FormInput className="h-4 w-4" />
              {t('classify.modeForm')}
            </Button>
            <Button
              variant={mode === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('chat')}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {t('classify.modeChat')}
            </Button>
          </div>
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
