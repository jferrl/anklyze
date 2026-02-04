import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  X,
  Image as ImageIcon,
  Save,
  Send,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  Images,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Calendar,
  Type,
  AlignLeft,
  Scan,
  Radio,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { caseApi } from '@/services';
import { CaseUsersManager } from '../../components/admin/CaseUsersManager';
import { GoldStandardInputDialog } from '../../components/cases';
import { cn } from '@/lib/utils';
import type { ImageCategory, CaseImage } from '@/types';
import type { ClassificationResult, FractureInput } from '@/types';
import { Switch } from '../../components/ui/switch';
import { Settings, Target, GitBranch } from 'lucide-react';

interface PendingUpload {
  id: string;
  file: File;
  category: ImageCategory;
  preview: string;
}

type Step = 'details' | 'settings' | 'images' | 'users';

const STEPS: Step[] = ['details', 'settings', 'images', 'users'];

export function CaseEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  // Current step state
  const [currentStep, setCurrentStep] = useState<Step>('details');

  // Fetch existing case if editing - must be before state that depends on it
  const { data: existingCase, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getCase(id!),
    enabled: isEditing,
  });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation case settings
  const [referenceClassification, setReferenceClassification] = useState<ClassificationResult | undefined>(undefined);
  const [referenceInput, setReferenceInput] = useState<FractureInput | undefined>(undefined);
  const [showReferenceAfterSubmit, setShowReferenceAfterSubmit] = useState(false);
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(true);
  const [showGoldStandardInputDialog, setShowGoldStandardInputDialog] = useState(false);

  // Track previous case ID to reset form when switching cases
  const [prevCaseId, setPrevCaseId] = useState<string | undefined>(undefined);
  if (existingCase && existingCase.id !== prevCaseId) {
    setPrevCaseId(existingCase.id);
    setTitle(existingCase.title);
    setDescription(existingCase.description || '');
    setDeadline(existingCase.deadline?.split('T')[0] || '');
    setPendingUploads([]);
    // Validation case settings
    setReferenceClassification(existingCase.reference_classification);
    setReferenceInput(existingCase.reference_input);
    setShowReferenceAfterSubmit(existingCase.show_reference_after_submit || false);
    setAllowMultipleResponses(existingCase.allow_multiple_responses !== false);
  }

  // Create case mutation
  const createMutation = useMutation({
    mutationFn: caseApi.createCase,
    onSuccess: async (caseData) => {
      const uploadsToProcess = [...pendingUploads];
      uploadsToProcess.forEach((upload) => URL.revokeObjectURL(upload.preview));
      setPendingUploads([]);
      for (const upload of uploadsToProcess) {
        await caseApi.uploadImage(caseData.id, upload.file, upload.category);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
      navigate(`/admin/cases/${caseData.id}/edit`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Update case mutation
  const updateMutation = useMutation({
    mutationFn: ({ caseId, data }: { caseId: string; data: Parameters<typeof caseApi.updateCase>[1] }) =>
      caseApi.updateCase(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: ({ caseId, file, category }: { caseId: string; file: File; category: ImageCategory }) =>
      caseApi.uploadImage(caseId, file, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: ({ caseId, imageId }: { caseId: string; imageId: string }) =>
      caseApi.deleteImage(caseId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: caseApi.publishCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['published-cases'], refetchType: 'all' });
      setShowPublishDialog(false);
      navigate('/admin/cases');
    },
  });

  const createOnDrop = useCallback(
    (category: ImageCategory) => (acceptedFiles: File[]) => {
      const newUploads = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        category,
        preview: URL.createObjectURL(file),
      }));
      setPendingUploads((prev) => [...prev, ...newUploads]);
    },
    []
  );

  const dropzoneConfig = {
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize: 10 * 1024 * 1024,
  };

  const xrayDropzone = useDropzone({
    ...dropzoneConfig,
    onDrop: createOnDrop('xray'),
  });

  const tacDropzone = useDropzone({
    ...dropzoneConfig,
    onDrop: createOnDrop('tac'),
  });

  const removePendingUpload = (uploadId: string) => {
    setPendingUploads((prev) => {
      const upload = prev.find((u) => u.id === uploadId);
      if (upload) {
        URL.revokeObjectURL(upload.preview);
      }
      return prev.filter((u) => u.id !== uploadId);
    });
  };

  const handleSave = async () => {
    setError(null);

    if (!title.trim()) {
      setError(t('admin.cases.errors.titleRequired'));
      setCurrentStep('details');
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      reference_classification: referenceClassification,
      reference_input: referenceInput,
      show_reference_after_submit: showReferenceAfterSubmit,
      allow_multiple_responses: allowMultipleResponses,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ caseId: id!, data });
      const uploadsToProcess = [...pendingUploads];
      uploadsToProcess.forEach((upload) => URL.revokeObjectURL(upload.preview));
      setPendingUploads([]);
      for (const upload of uploadsToProcess) {
        await uploadImageMutation.mutateAsync({
          caseId: id!,
          file: upload.file,
          category: upload.category,
        });
      }
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handlePublish = () => {
    const totalImages = (existingCase?.images?.length ?? 0) + pendingUploads.length;
    if (totalImages === 0) {
      setError(t('admin.cases.errors.imagesRequired'));
      setCurrentStep('images');
      return;
    }
    setShowPublishDialog(true);
  };

  const confirmPublish = async () => {
    if (isEditing) {
      await handleSave();
      publishMutation.mutate(id!);
    }
  };

  const existingImages = existingCase?.images ?? [];
  const xrayImages = existingImages.filter((img) => img.category === 'xray');
  const tacImages = existingImages.filter((img) => img.category === 'tac');
  const pendingXray = pendingUploads.filter((u) => u.category === 'xray');
  const pendingTac = pendingUploads.filter((u) => u.category === 'tac');
  const totalImages = existingImages.length + pendingUploads.length;

  const isSaving = createMutation.isPending || updateMutation.isPending || uploadImageMutation.isPending;
  const canPublish = isEditing && existingCase?.status === 'draft';
  const canEdit = !isEditing || existingCase?.status === 'draft';
  // Description and deadline can be edited even after publication
  const canEditAlways = !isEditing || existingCase?.status !== 'closed';

  const currentStepIndex = STEPS.indexOf(currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      // Skip users step if not editing
      if (STEPS[nextIndex] === 'users' && !isEditing) {
        return;
      }
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const getStepStatus = (step: Step): 'completed' | 'current' | 'upcoming' => {
    const stepIndex = STEPS.indexOf(step);
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const stepConfig = {
    details: {
      icon: FileText,
      label: t('admin.cases.details'),
      description: t('admin.cases.detailsDescription'),
    },
    settings: {
      icon: Settings,
      label: t('admin.cases.validationSettings', 'Validation'),
      description: t('admin.cases.validationSettingsDescription', 'Configure validation case options'),
    },
    images: {
      icon: Images,
      label: t('admin.cases.images'),
      description: t('admin.cases.imagesDescription'),
    },
    users: {
      icon: Users,
      label: t('admin.cases.users.title'),
      description: t('admin.cases.users.description'),
    },
  };

  if (isEditing && isLoadingCase) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 blur-xl mx-auto" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {isEditing ? t('admin.cases.editCase') : t('admin.cases.createCase')}
                  </h1>
                  {existingCase && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'mt-1',
                        existingCase.status === 'published' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                        existingCase.status === 'closed' && 'border-muted-foreground/50'
                      )}
                    >
                      {t(`cases.status.${existingCase.status}`)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('common.save')}
              </Button>
              {canPublish && (
                <Button
                  onClick={handlePublish}
                  disabled={isSaving}
                  className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                >
                  <Send className="h-4 w-4" />
                  {t('admin.cases.publish')}
                </Button>
              )}
            </div>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stepper Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              // Skip users step in stepper if not editing
              if (step === 'users' && !isEditing) return null;

              const status = getStepStatus(step);
              const config = stepConfig[step];
              const Icon = config.icon;
              const isLast = index === STEPS.length - 1 || (step === 'images' && !isEditing);

              return (
                <div key={step} className="flex items-center flex-1">
                  <button
                    onClick={() => setCurrentStep(step)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                      status === 'current' && 'bg-primary/10 ring-2 ring-primary/20',
                      status === 'completed' && 'bg-emerald-500/10 hover:bg-emerald-500/15',
                      status === 'upcoming' && 'opacity-50 hover:opacity-70'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                        status === 'current' && 'bg-primary text-primary-foreground',
                        status === 'completed' && 'bg-emerald-500 text-white',
                        status === 'upcoming' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {status === 'completed' ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className={cn(
                        'text-sm font-medium',
                        status === 'current' && 'text-primary',
                        status === 'completed' && 'text-emerald-600 dark:text-emerald-400',
                        status === 'upcoming' && 'text-muted-foreground'
                      )}>
                        {config.label}
                      </p>
                      <p className="text-xs text-muted-foreground hidden lg:block">
                        {status === 'completed' ? (
                          step === 'details' ? (title || '-') :
                          step === 'images' ? `${totalImages} ${t('cases.imagesCount')}` :
                          '-'
                        ) : '-'}
                      </p>
                    </div>
                  </button>

                  {!isLast && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-2 rounded-full transition-colors',
                      status === 'completed' ? 'bg-emerald-500' : 'bg-border'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Details Step */}
          {currentStep === 'details' && (
            <div className="animate-fade-in">
              <Card className="chart-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t('admin.cases.details')}</CardTitle>
                      <CardDescription>{t('admin.cases.detailsDescription')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-muted-foreground" />
                      {t('cases.title')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('admin.cases.titlePlaceholder')}
                      disabled={!canEdit}
                      className="h-12 text-base"
                    />
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
                      <AlignLeft className="w-4 h-4 text-muted-foreground" />
                      {t('cases.description')}
                      <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('admin.cases.descriptionPlaceholder')}
                      rows={4}
                      disabled={!canEditAlways}
                      className="resize-none"
                    />
                  </div>

                  {/* Deadline Field */}
                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {t('cases.deadline')}
                      <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                    </Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      disabled={!canEditAlways}
                      className="h-12"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-end mt-6">
                <Button onClick={goToNextStep} className="gap-2">
                  {t('common.next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Settings Step */}
          {currentStep === 'settings' && (
            <div className="animate-fade-in">
              <Card className="chart-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t('admin.cases.validationSettings', 'Validation Settings')}</CardTitle>
                      <CardDescription>
                        {t('admin.cases.validationSettingsDescription', 'Configure how this case validates responses')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Reference Classification */}
                  <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mt-0.5">
                        <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {t('admin.cases.referenceClassification', 'Reference Classification (Gold Standard)')}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('admin.cases.referenceClassificationDescription',
                            'Set the correct classification to compare against participant responses')}
                        </p>
                      </div>
                    </div>

                    {referenceClassification ? (
                      <div className="ml-11 space-y-3">
                        <div className="p-3 rounded-lg bg-background border border-border/50">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {referenceClassification.danis_weber && (
                              <div>
                                <span className="text-muted-foreground">Danis-Weber:</span>{' '}
                                <span className="font-medium">{referenceClassification.danis_weber.type}</span>
                              </div>
                            )}
                            {referenceClassification.lauge_hansen && (
                              <div>
                                <span className="text-muted-foreground">Lauge-Hansen:</span>{' '}
                                <span className="font-medium">{referenceClassification.lauge_hansen.type}</span>
                              </div>
                            )}
                            {referenceClassification.ao_ota && (
                              <div>
                                <span className="text-muted-foreground">AO/OTA:</span>{' '}
                                <span className="font-medium">{referenceClassification.ao_ota.code}</span>
                              </div>
                            )}
                            {referenceClassification.bartonicek && (
                              <div>
                                <span className="text-muted-foreground">Bartonicek:</span>{' '}
                                <span className="font-medium">{referenceClassification.bartonicek.type}</span>
                              </div>
                            )}
                          </div>
                          {referenceInput && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                                <GitBranch className="w-3 h-3" />
                                <span>{t('admin.cases.decisionPathConfigured', 'Decision path configured for divergence analysis')}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowGoldStandardInputDialog(true)}
                            disabled={!canEdit}
                            className="gap-1"
                          >
                            <GitBranch className="w-4 h-4" />
                            {t('admin.cases.changeReference', 'Change')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReferenceClassification(undefined);
                              setReferenceInput(undefined);
                            }}
                            disabled={!canEdit}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t('admin.cases.clearReference', 'Clear')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="ml-11">
                        <Button
                          type="button"
                          onClick={() => setShowGoldStandardInputDialog(true)}
                          disabled={!canEdit}
                          className="gap-2"
                        >
                          <Target className="w-4 h-4" />
                          {t('admin.cases.setReference', 'Set Reference Classification')}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Response Options */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">
                      {t('admin.cases.responseOptions', 'Response Options')}
                    </h3>

                    {/* Allow Multiple Responses */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="space-y-1">
                        <Label htmlFor="allowMultiple" className="font-medium cursor-pointer">
                          {t('admin.cases.allowMultipleResponses', 'Allow Multiple Responses')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('admin.cases.allowMultipleResponsesDescription',
                            'When disabled, each participant can only submit one response')}
                        </p>
                      </div>
                      <Switch
                        id="allowMultiple"
                        checked={allowMultipleResponses}
                        onCheckedChange={setAllowMultipleResponses}
                        disabled={!canEdit}
                      />
                    </div>

                    {/* Show Reference After Submit */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="space-y-1">
                        <Label htmlFor="showReference" className="font-medium cursor-pointer">
                          {t('admin.cases.showReferenceAfterSubmit', 'Show Reference After Submit')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('admin.cases.showReferenceAfterSubmitDescription',
                            'Display the correct classification after participants submit their response')}
                        </p>
                      </div>
                      <Switch
                        id="showReference"
                        checked={showReferenceAfterSubmit}
                        onCheckedChange={setShowReferenceAfterSubmit}
                        disabled={!canEdit || !referenceClassification}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  {t('common.previous')}
                </Button>
                <Button onClick={goToNextStep} className="gap-2">
                  {t('common.next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Images Step */}
          {currentStep === 'images' && (
            <div className="animate-fade-in">
              <Card className="chart-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Images className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t('admin.cases.images')}</CardTitle>
                      <CardDescription>{t('admin.cases.imagesDescription')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* X-ray Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{t('cases.images.xray')}</h3>
                        <p className="text-sm text-muted-foreground">
                          {xrayImages.length + pendingXray.length} {t('cases.imagesCount')}
                        </p>
                      </div>
                    </div>

                    {/* X-ray Dropzone */}
                    {canEdit && (
                      <div
                        {...xrayDropzone.getRootProps()}
                        className={cn(
                          'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300',
                          'hover:border-blue-500/50 hover:bg-blue-500/5',
                          xrayDropzone.isDragActive
                            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                            : 'border-muted-foreground/25'
                        )}
                      >
                        <input {...xrayDropzone.getInputProps()} />
                        <div className="flex items-center justify-center gap-4">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
                            xrayDropzone.isDragActive ? 'bg-blue-500/20 scale-110' : 'bg-muted'
                          )}>
                            <Radio className={cn(
                              'w-6 h-6 transition-colors',
                              xrayDropzone.isDragActive ? 'text-blue-500' : 'text-muted-foreground'
                            )} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-foreground">
                              {xrayDropzone.isDragActive
                                ? t('admin.cases.dropHere')
                                : t('admin.cases.dragOrClick')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('admin.cases.maxFileSize')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* X-ray Images Grid */}
                    <ImageGrid
                      existingImages={xrayImages}
                      pendingUploads={pendingXray}
                      onRemovePending={removePendingUpload}
                      onDeleteExisting={(imageId) =>
                        deleteImageMutation.mutate({ caseId: id!, imageId })
                      }
                      canEdit={canEdit}
                      caseId={id}
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/50" />

                  {/* CT Scan Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Scan className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{t('cases.images.tac')}</h3>
                        <p className="text-sm text-muted-foreground">
                          {tacImages.length + pendingTac.length} {t('cases.imagesCount')}
                        </p>
                      </div>
                    </div>

                    {/* CT Scan Dropzone */}
                    {canEdit && (
                      <div
                        {...tacDropzone.getRootProps()}
                        className={cn(
                          'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300',
                          'hover:border-emerald-500/50 hover:bg-emerald-500/5',
                          tacDropzone.isDragActive
                            ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                            : 'border-muted-foreground/25'
                        )}
                      >
                        <input {...tacDropzone.getInputProps()} />
                        <div className="flex items-center justify-center gap-4">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
                            tacDropzone.isDragActive ? 'bg-emerald-500/20 scale-110' : 'bg-muted'
                          )}>
                            <Scan className={cn(
                              'w-6 h-6 transition-colors',
                              tacDropzone.isDragActive ? 'text-emerald-500' : 'text-muted-foreground'
                            )} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-foreground">
                              {tacDropzone.isDragActive
                                ? t('admin.cases.dropHere')
                                : t('admin.cases.dragOrClick')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t('admin.cases.maxFileSize')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CT Scan Images Grid */}
                    <ImageGrid
                      existingImages={tacImages}
                      pendingUploads={pendingTac}
                      onRemovePending={removePendingUpload}
                      onDeleteExisting={(imageId) =>
                        deleteImageMutation.mutate({ caseId: id!, imageId })
                      }
                      canEdit={canEdit}
                      caseId={id}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  {t('common.previous')}
                </Button>
                {isEditing && (
                  <Button onClick={goToNextStep} className="gap-2">
                    {t('common.next')}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Users Step */}
          {currentStep === 'users' && isEditing && (
            <div className="animate-fade-in">
              <CaseUsersManager
                caseId={id!}
                disabled={existingCase?.status === 'closed'}
              />

              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  {t('common.previous')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.cases.publishConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.cases.publishConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish} className="gap-2">
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t('admin.cases.publish')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gold Standard Input Dialog (via Questionnaire) */}
      <GoldStandardInputDialog
        open={showGoldStandardInputDialog}
        onOpenChange={setShowGoldStandardInputDialog}
        hasTACImages={tacImages.length + pendingTac.length > 0}
        initialInput={referenceInput}
        initialClassification={referenceClassification}
        onSave={(input, classification) => {
          setReferenceInput(input);
          setReferenceClassification(classification);
        }}
      />
    </div>
  );
}

interface ImageGridProps {
  existingImages: CaseImage[];
  pendingUploads: PendingUpload[];
  onRemovePending: (id: string) => void;
  onDeleteExisting: (imageId: string) => void;
  canEdit: boolean;
  caseId?: string;
}

function ImageGrid({
  existingImages,
  pendingUploads,
  onRemovePending,
  onDeleteExisting,
  canEdit,
  caseId,
}: ImageGridProps) {
  const { t } = useTranslation();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const fetchImageUrl = async (image: CaseImage) => {
    if (!caseId || imageUrls[image.id]) return;
    try {
      const url = await caseApi.getAdminImageUrl(caseId, image.id);
      setImageUrls((prev) => ({ ...prev, [image.id]: url }));
    } catch (error) {
      console.error('Failed to fetch image URL:', error);
    }
  };

  if (existingImages.length === 0 && pendingUploads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">{t('admin.cases.noImages')}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {t('admin.cases.dragOrClick')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {/* Existing images */}
      {existingImages.map((image, index) => {
        if (!imageUrls[image.id]) {
          fetchImageUrl(image);
        }
        return (
          <div
            key={image.id}
            className="relative group animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 transition-all group-hover:ring-primary/30 group-hover:shadow-lg">
              {imageUrls[image.id] ? (
                <img
                  src={imageUrls[image.id]}
                  alt={image.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {canEdit && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                onClick={() => onDeleteExisting(image.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}

      {/* Pending uploads */}
      {pendingUploads.map((upload, index) => (
        <div
          key={upload.id}
          className="relative group animate-fade-in"
          style={{ animationDelay: `${(existingImages.length + index) * 50}ms` }}
        >
          <div className="aspect-square rounded-xl overflow-hidden bg-muted ring-2 ring-dashed ring-primary/50">
            <img
              src={upload.preview}
              alt="Pending upload"
              className="w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              <Badge className="bg-primary/90 text-primary-foreground shadow-lg">
                <Upload className="w-3 h-3 mr-1" />
                {t('admin.cases.pending')}
              </Badge>
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 shadow-lg"
            onClick={() => onRemovePending(upload.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
