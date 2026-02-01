import { useTranslation } from 'react-i18next';
import { UserProfileForm } from '../components/profile';

export function ProfilePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('profile.pageTitle', 'Profile Settings')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('profile.pageDescription', 'Manage your expertise profile information')}
          </p>
        </header>

        <div className="chart-card">
          <UserProfileForm />
        </div>
      </div>
    </div>
  );
}
