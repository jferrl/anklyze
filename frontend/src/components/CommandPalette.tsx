import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Workflow,
  BookOpen,
  LayoutDashboard,
  FileText,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from './ThemeProvider';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('command.searchPlaceholder')} />
      {/* Tall enough for every group, so the last row is never cut mid-height. */}
      <CommandList className="max-h-[min(32rem,70vh)]">
        <CommandEmpty>{t('command.noResults')}</CommandEmpty>

        <CommandGroup heading={t('command.navigation')}>
          <CommandItem onSelect={() => runCommand(() => navigate('/classify'))}>
            <Workflow className="mr-2 h-4 w-4" />
            <span>{t('nav.classify')}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/cases'))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>{t('nav.cases')}</span>
          </CommandItem>
        </CommandGroup>

        {isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('command.admin')}>
              <CommandItem onSelect={() => runCommand(() => navigate('/admin'))}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>{t('nav.dashboard')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/admin/cases'))}>
                <FileText className="mr-2 h-4 w-4" />
                <span>{t('nav.manageCases')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/admin/studies'))}>
                <Activity className="mr-2 h-4 w-4" />
                <span>{t('nav.studies')}</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading={t('command.settings')}>
          <CommandItem onSelect={() => runCommand(toggleTheme)}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>
              {theme === 'dark'
                ? t('command.lightMode')
                : t('command.darkMode')}
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t('command.account')}>
          <CommandItem onSelect={() => runCommand(signOut)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('auth.signOut')}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
