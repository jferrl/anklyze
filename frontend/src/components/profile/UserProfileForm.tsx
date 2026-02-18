import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { getUserProfile, updateUserProfile } from '@/services';
import type { UpdateUserProfileRequest, Specialty, TrainingLevel } from '@/types';
import { toast } from 'sonner';

const SPECIALTIES: { value: Specialty; labelKey: string }[] = [
  { value: 'foot_ankle', labelKey: 'profile.specialties.footAnkle' },
  { value: 'other', labelKey: 'profile.specialties.other' },
];

const TRAINING_LEVELS: { value: TrainingLevel; labelKey: string }[] = [
  { value: 'resident', labelKey: 'profile.trainingLevels.resident' },
  { value: 'attending', labelKey: 'profile.trainingLevels.attending' },
];

export function UserProfileForm() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  interface FormState {
    displayName: string;
    yearsExperience: string;
    specialty: string;
    trainingLevel: string;
    institution: string;
  }

  const [form, setForm] = useState<FormState>({
    displayName: '',
    yearsExperience: '',
    specialty: '',
    trainingLevel: '',
    institution: '',
  });

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfile,
  });

  // Sync profile data to form state when profile loads (render-time state adjustment)
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevProfileId, setPrevProfileId] = useState<string | null>(null);
  if (profile && prevProfileId !== profile.id) {
    setPrevProfileId(profile.id);
    setForm({
      displayName: profile.display_name || '',
      yearsExperience: profile.years_experience?.toString() || '',
      specialty: profile.specialty || '',
      trainingLevel: profile.training_level || '',
      institution: profile.institution || '',
    });
  }

  const mutation = useMutation({
    mutationFn: (data: UpdateUserProfileRequest) => updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success(t('profile.saved', 'Profile saved successfully'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('profile.saveFailed', 'Failed to save profile'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: UpdateUserProfileRequest = {};

    if (form.displayName !== (profile?.display_name || '')) {
      data.display_name = form.displayName || undefined;
    }

    const years = form.yearsExperience ? parseInt(form.yearsExperience, 10) : undefined;
    if (years !== profile?.years_experience) {
      data.years_experience = years;
    }

    if (form.specialty !== (profile?.specialty || '')) {
      data.specialty = (form.specialty || undefined) as Specialty | undefined;
    }

    if (form.trainingLevel !== (profile?.training_level || '')) {
      data.training_level = (form.trainingLevel || undefined) as TrainingLevel | undefined;
    }

    if (form.institution !== (profile?.institution || '')) {
      data.institution = form.institution || undefined;
    }

    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('profile.title', 'Your Profile')}
          </h2>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">
            {t('profile.displayName', 'Display Name')}
          </Label>
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => updateField('displayName', e.target.value)}
            placeholder={t('profile.displayNamePlaceholder', 'Your name')}
          />
        </div>

        {/* Years of Experience */}
        <div className="space-y-2">
          <Label htmlFor="yearsExperience">
            {t('profile.yearsExperience', 'Years of Experience')}
          </Label>
          <Input
            id="yearsExperience"
            type="number"
            min={0}
            max={70}
            value={form.yearsExperience}
            onChange={(e) => updateField('yearsExperience', e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Specialty */}
        <div className="space-y-2">
          <Label htmlFor="specialty">
            {t('profile.specialty', 'Specialty')}
          </Label>
          <Select value={form.specialty || '__none__'} onValueChange={(v) => updateField('specialty', v === '__none__' ? '' : v)}>
            <SelectTrigger id="specialty">
              <SelectValue placeholder={t('profile.selectSpecialty', 'Select specialty')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                {t('profile.notSpecified', 'Not specified')}
              </SelectItem>
              {SPECIALTIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {t(s.labelKey, s.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Training Level */}
        <div className="space-y-2">
          <Label htmlFor="trainingLevel">
            {t('profile.trainingLevel', 'Training Level')}
          </Label>
          <Select value={form.trainingLevel || '__none__'} onValueChange={(v) => updateField('trainingLevel', v === '__none__' ? '' : v)}>
            <SelectTrigger id="trainingLevel">
              <SelectValue placeholder={t('profile.selectTrainingLevel', 'Select level')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                {t('profile.notSpecified', 'Not specified')}
              </SelectItem>
              {TRAINING_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {t(level.labelKey, level.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Institution */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="institution">
            {t('profile.institution', 'Institution')}
          </Label>
          <Input
            id="institution"
            value={form.institution}
            onChange={(e) => updateField('institution', e.target.value)}
            placeholder={t('profile.institutionPlaceholder', 'Hospital or university name')}
            maxLength={255}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('profile.save', 'Save Profile')}
        </Button>
      </div>
    </form>
  );
}
