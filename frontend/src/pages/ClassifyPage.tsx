import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { FractureForm } from '../components/FractureForm';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { FlowDiagramSidebar } from '../components/FlowDiagramSidebar';

export function ClassifyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl tracking-tight">Anklyze</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('classify.backToHome')}
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Form Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <FractureForm />
        </div>
      </section>

      {/* Flow Diagram Sidebar */}
      <FlowDiagramSidebar />
    </div>
  );
}
