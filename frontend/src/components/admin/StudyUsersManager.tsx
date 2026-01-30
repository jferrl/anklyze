import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Loader2, Users, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { studyApi } from '../../services/studyApi';

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
    queryKey: ['study-users', studyId],
    queryFn: () => studyApi.listStudyUsers(studyId),
  });

  const addMutation = useMutation({
    mutationFn: (userEmail: string) =>
      studyApi.addStudyUser(studyId, { user_email: userEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-users', studyId] });
      setEmail('');
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => studyApi.removeStudyUser(studyId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-users', studyId] });
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

  const users = data?.users ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('admin.studies.users.title')}
        </CardTitle>
        <CardDescription>{t('admin.studies.users.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!disabled && (
          <form onSubmit={handleAdd} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('admin.studies.users.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={addMutation.isPending || !email.trim()}>
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span className="ml-2">{t('admin.studies.users.add')}</span>
            </Button>
          </form>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t('admin.studies.users.empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.studies.users.email')}</TableHead>
                <TableHead>{t('admin.studies.users.addedAt')}</TableHead>
                {!disabled && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.user_email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  {!disabled && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMutation.mutate(user.user_id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
