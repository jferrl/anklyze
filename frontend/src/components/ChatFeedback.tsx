import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Loader2, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { FeedbackRating } from '@/types';

interface ChatFeedbackProps {
  onSubmit: (rating: FeedbackRating, comment?: string) => Promise<void>;
  submitted: boolean;
}

export function ChatFeedback({ onSubmit, submitted }: ChatFeedbackProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const handleRatingClick = (rating: FeedbackRating) => {
    setSelectedRating(rating);
    setShowComment(true);
  };

  const handleSubmit = async () => {
    if (!selectedRating) return;

    setIsLoading(true);
    try {
      await onSubmit(selectedRating, comment || undefined);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" />
            <span>{t('feedback.thankYou')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {t('feedback.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant={selectedRating === 'positive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleRatingClick('positive')}
            disabled={isLoading}
          >
            <ThumbsUp className="h-4 w-4" />
            {t('feedback.helpful')}
          </Button>
          <Button
            variant={selectedRating === 'negative' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => handleRatingClick('negative')}
            disabled={isLoading}
          >
            <ThumbsDown className="h-4 w-4" />
            {t('feedback.notHelpful')}
          </Button>
        </div>

        {showComment && (
          <div className="space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('feedback.commentPlaceholder')}
              className="w-full p-2 text-sm border rounded-md resize-none bg-background"
              rows={2}
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !selectedRating}
              size="sm"
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('feedback.submit')
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
