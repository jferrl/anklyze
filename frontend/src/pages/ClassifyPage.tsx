import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Activity, Home, FormInput, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { FractureForm } from '../components/FractureForm';
import { ChatPanel } from '../components/ChatPanel';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { FlowDiagramSidebar } from '../components/FlowDiagramSidebar';

type InputMode = 'form' | 'chat';

export function ClassifyPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<InputMode>('form');

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-semibold text-xl tracking-tight">Anklyze</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('classify.backToHome')}</span>
              </Link>
            </Button>
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Mode Toggle */}
      <div className="container mx-auto px-4 pt-6">
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
