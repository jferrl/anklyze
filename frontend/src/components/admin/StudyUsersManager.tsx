import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Loader2, Users, Mail, UserCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { studyApi } from '@/services';
import { cn } from '@/lib/utils';

interface StudyUsersManagerProps {
  studyId: string;
  disabled?: boolean;
}

export function StudyUsersManager({ studyId, disabled }: StudyUsersManagerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['study-raters', studyId],
    queryFn: () => studyApi.listStudyRaters(studyId),
  });

  const addMutation = useMutation({
    mutationFn: (userEmail: string) =>
      studyApi.addStudyRater(studyId, userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-raters', studyId] });
      setEmail('');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => studyApi.removeStudyRater(studyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-raters', studyId] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    addMutation.mutate(email.trim());
  };

  const raters = data?.raters ?? [];

  return (
    <Card className="chart-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>{t('admin.studies.raters.title', 'Assigned Raters')}</CardTitle>
            <CardDescription>{t('admin.studies.raters.description', 'Manage who can rate cases in this study')}</CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            {raters.length} {raters.length === 1 ? 'rater' : 'raters'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!disabled && (
          <form onSubmit={handleAdd} className="mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t('admin.studies.raters.emailPlaceholder', 'Enter rater email address...')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              <Button
                type="submit"
                disabled={addMutation.isPending || !email.trim()}
                className="h-12 px-6 gap-2"
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span>{t('admin.studies.raters.add', 'Add Rater')}</span>
              </Button>
            </div>
          </form>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4 animate-fade-in">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : raters.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">
              {t('admin.studies.raters.empty', 'No raters assigned')}
            </p>
            {!disabled && (
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t('admin.studies.raters.emailPlaceholder', 'Enter rater email address...')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {raters.map((rater, index) => (
              <div
                key={rater.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl',
                  'bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50',
                  'transition-all duration-200 group animate-fade-in'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {rater.user_email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.studies.raters.addedAt', 'Added')}: {new Date(rater.created_at).toLocaleDateString()}
                  </p>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMutation.mutate(rater.user_id)}
                    disabled={removeMutation.isPending}
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
