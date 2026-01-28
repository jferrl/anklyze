import { LogOut, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../contexts/AuthContext';

export function UserMenu() {
  const { t } = useTranslation();
  const { profile, signOut, isAdmin, isConfigured, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Don't show if auth is not configured
  if (!isConfigured) {
    return null;
  }

  // Show login button if not authenticated
  if (!isAuthenticated || !profile) {
    return (
      <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
        {t('auth.signIn', 'Sign in')}
      </Button>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-5 w-5 rounded-full"
            />
          ) : (
            <User className="h-4 w-4" />
          )}
          <span className="hidden sm:inline max-w-[120px] truncate">
            {profile.displayName || profile.email}
          </span>
          {isAdmin && <Shield className="h-3 w-3 text-primary" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {profile.email}
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
              <Shield className="h-3 w-3 mr-2" />
              {t('auth.adminRole', 'Administrator')}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          {t('auth.signOut', 'Sign out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
