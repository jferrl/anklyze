import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
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

const NONE = '__none__';

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

  // A stored value outside the option list falls back to "not specified" so the trigger is never blank.
  const specialty = SPECIALTIES.find((s) => s.value === form.specialty);
  const trainingLevel = TRAINING_LEVELS.find((l) => l.value === form.trainingLevel);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">{profile?.email}</p>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Display Name */}
        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="specialty">
            {t('profile.specialty', 'Specialty')}
          </Label>
          <Select value={specialty?.value ?? NONE} onValueChange={(v) => updateField('specialty', v === NONE ? '' : v)}>
            <SelectTrigger id="specialty">
              <SelectValue>
                {specialty ? t(specialty.labelKey, specialty.value) : t('profile.notSpecified', 'Not specified')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="trainingLevel">
            {t('profile.trainingLevel', 'Training Level')}
          </Label>
          <Select value={trainingLevel?.value ?? NONE} onValueChange={(v) => updateField('trainingLevel', v === NONE ? '' : v)}>
            <SelectTrigger id="trainingLevel">
              <SelectValue>
                {trainingLevel ? t(trainingLevel.labelKey, trainingLevel.value) : t('profile.notSpecified', 'Not specified')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>
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
        <div className="flex flex-col gap-2 sm:col-span-2">
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

      <div className="flex justify-end border-t pt-4">
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
