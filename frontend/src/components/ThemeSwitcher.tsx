import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from './ThemeProvider';

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <Switch
        id="theme-switch"
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label={t('theme.toggle')}
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
      <Label htmlFor="theme-switch" className="sr-only">
        {t('theme.toggle')}
      </Label>
    </div>
  );
}
