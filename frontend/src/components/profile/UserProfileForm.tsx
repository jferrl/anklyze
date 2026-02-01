import { useState, useRef, useEffect } from 'react';
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
import { getUserProfile, updateUserProfile } from '../../services/studyApi';
import type { UpdateUserProfileRequest, Specialty, TrainingLevel } from '../../types/study';
import { toast } from 'sonner';

const SPECIALTIES: { value: Specialty; labelKey: string }[] = [
  { value: 'traumatology', labelKey: 'profile.specialties.traumatology' },
  { value: 'orthopedics', labelKey: 'profile.specialties.orthopedics' },
  { value: 'emergency', labelKey: 'profile.specialties.emergency' },
  { value: 'radiology', labelKey: 'profile.specialties.radiology' },
  { value: 'general', labelKey: 'profile.specialties.general' },
  { value: 'other', labelKey: 'profile.specialties.other' },
];

const TRAINING_LEVELS: { value: TrainingLevel; labelKey: string }[] = [
  { value: 'resident', labelKey: 'profile.trainingLevels.resident' },
  { value: 'fellow', labelKey: 'profile.trainingLevels.fellow' },
  { value: 'attending', labelKey: 'profile.trainingLevels.attending' },
  { value: 'other', labelKey: 'profile.trainingLevels.other' },
];

export function UserProfileForm() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const initializedRef = useRef<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [specialty, setSpecialty] = useState<string>('');
  const [trainingLevel, setTrainingLevel] = useState<string>('');
  const [institution, setInstitution] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfile,
  });

  // Sync profile data to form state when profile loads (only once per profile ID)
  useEffect(() => {
    if (profile && initializedRef.current !== profile.id) {
      initializedRef.current = profile.id;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setDisplayName(profile.display_name || '');
        setYearsExperience(profile.years_experience?.toString() || '');
        setSpecialty(profile.specialty || '');
        setTrainingLevel(profile.training_level || '');
        setInstitution(profile.institution || '');
      }, 0);
    }
  }, [profile]);

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

    if (displayName !== (profile?.display_name || '')) {
      data.display_name = displayName || undefined;
    }

    const years = yearsExperience ? parseInt(yearsExperience, 10) : undefined;
    if (years !== profile?.years_experience) {
      data.years_experience = years;
    }

    if (specialty !== (profile?.specialty || '')) {
      data.specialty = (specialty || undefined) as Specialty | undefined;
    }

    if (trainingLevel !== (profile?.training_level || '')) {
      data.training_level = (trainingLevel || undefined) as TrainingLevel | undefined;
    }

    if (institution !== (profile?.institution || '')) {
      data.institution = institution || undefined;
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
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Specialty */}
        <div className="space-y-2">
          <Label htmlFor="specialty">
            {t('profile.specialty', 'Specialty')}
          </Label>
          <Select value={specialty || '__none__'} onValueChange={(v) => setSpecialty(v === '__none__' ? '' : v)}>
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
          <Select value={trainingLevel || '__none__'} onValueChange={(v) => setTrainingLevel(v === '__none__' ? '' : v)}>
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
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
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
