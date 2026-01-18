import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n/config';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    changeLanguage(newLang);
    // Reload the page to refetch options with new language
    window.location.reload();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="text-sm"
    >
      {i18n.language === 'en' ? t('language.es') : t('language.en')}
    </Button>
  );
}
