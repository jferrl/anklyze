import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserProfileForm } from '../components/profile';

export function ProfilePage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        title={t('profile.pageTitle', 'Profile Settings')}
        description={t('profile.pageDescription', 'Manage your expertise profile information')}
      />
      <div className="max-w-2xl">
        <UserProfileForm />
      </div>
    </div>
  );
}
