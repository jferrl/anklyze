import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
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
      <CommandInput placeholder={t('command.searchPlaceholder', 'Type a command or search...')} />
      <CommandList>
        <CommandEmpty>{t('command.noResults', 'No results found.')}</CommandEmpty>

        <CommandGroup heading={t('command.navigation', 'Navigation')}>
          <CommandItem onSelect={() => runCommand(() => navigate('/classify'))}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>{t('nav.classify')}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/studies'))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>{t('nav.studies')}</span>
          </CommandItem>
        </CommandGroup>

        {isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('command.admin', 'Admin')}>
              <CommandItem onSelect={() => runCommand(() => navigate('/admin'))}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>{t('nav.dashboard')}</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/admin/studies'))}>
                <FileText className="mr-2 h-4 w-4" />
                <span>{t('nav.manageStudies')}</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading={t('command.settings', 'Settings')}>
          <CommandItem onSelect={() => runCommand(toggleTheme)}>
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>
              {theme === 'dark'
                ? t('command.lightMode', 'Switch to light mode')
                : t('command.darkMode', 'Switch to dark mode')}
            </span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading={t('command.account', 'Account')}>
          <CommandItem onSelect={() => runCommand(signOut)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('auth.signOut')}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
