import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { generateShareUrl, copyToClipboard } from '@/utils/shareUrl';
import type { FractureInput } from '@/types/fracture';

interface ShareButtonProps {
  formData: FractureInput;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function ShareButton({
  formData,
  variant = 'outline',
  size = 'lg',
  className = ''
}: ShareButtonProps) {
  const { t } = useTranslation();

  const handleShare = async () => {
    const url = generateShareUrl(formData);
    const success = await copyToClipboard(url);

    if (success) {
      toast.success(t('form.linkCopied'));
    } else {
      toast.error(t('form.copyFailed'));
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
    >
      <Share2 className="h-4 w-4" />
      {t('share.button')}
    </Button>
  );
}
