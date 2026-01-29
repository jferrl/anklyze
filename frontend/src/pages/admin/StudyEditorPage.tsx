import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  Activity,
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Save,
  Send,
  AlertCircle,
  Loader2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { UserMenu } from '../../components/auth/UserMenu';
import { studyApi } from '../../services/studyApi';
import type { ImageCategory, StudyImage } from '../../types/study';

interface PendingUpload {
  id: string;
  file: File;
  category: ImageCategory;
  caption: string;
  preview: string;
}

export function StudyEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploadCategory, setUploadCategory] = useState<ImageCategory>('xray');
  const uploadCategoryRef = useRef<ImageCategory>(uploadCategory);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    uploadCategoryRef.current = uploadCategory;
  }, [uploadCategory]);

  // Fetch existing study if editing
  const { data: existingStudy, isLoading: isLoadingStudy } = useQuery({
    queryKey: ['study', id],
    queryFn: () => studyApi.getStudy(id!),
    enabled: isEditing,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingStudy) {
      setTitle(existingStudy.title);
      setDescription(existingStudy.description || '');
      setDeadline(existingStudy.deadline?.split('T')[0] || '');
    }
  }, [existingStudy]);

  // Create study mutation
  const createMutation = useMutation({
    mutationFn: studyApi.createStudy,
    onSuccess: async (study) => {
      // Upload pending images
      for (const upload of pendingUploads) {
        await studyApi.uploadImage(study.id, upload.file, upload.category, upload.caption);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
      navigate(`/admin/studies/${study.id}/edit`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Update study mutation
  const updateMutation = useMutation({
    mutationFn: ({ studyId, data }: { studyId: string; data: Parameters<typeof studyApi.updateStudy>[1] }) =>
      studyApi.updateStudy(studyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: ({ studyId, file, category, caption }: { studyId: string; file: File; category: ImageCategory; caption: string }) =>
      studyApi.uploadImage(studyId, file, category, caption),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', id] });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: ({ studyId, imageId }: { studyId: string; imageId: string }) =>
      studyApi.deleteImage(studyId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', id] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: studyApi.publishStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
      setShowPublishDialog(false);
      navigate('/admin/studies');
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Use ref to get current category value (fixes stale closure issue with react-dropzone)
      const currentCategory = uploadCategoryRef.current;
      const newUploads = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        category: currentCategory,
        caption: '',
        preview: URL.createObjectURL(file),
      }));
      setPendingUploads((prev) => [...prev, ...newUploads]);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
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

  const updatePendingCaption = (uploadId: string, caption: string) => {
    setPendingUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, caption } : u))
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!title.trim()) {
      setError(t('admin.studies.errors.titleRequired'));
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ studyId: id!, data });
      // Upload any pending images
      for (const upload of pendingUploads) {
        await uploadImageMutation.mutateAsync({
          studyId: id!,
          file: upload.file,
          category: upload.category,
          caption: upload.caption,
        });
      }
      setPendingUploads([]);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handlePublish = () => {
    const totalImages = (existingStudy?.images?.length ?? 0) + pendingUploads.length;
    if (totalImages === 0) {
      setError(t('admin.studies.errors.imagesRequired'));
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

  const existingImages = existingStudy?.images ?? [];
  const xrayImages = existingImages.filter((img) => img.category === 'xray');
  const tacImages = existingImages.filter((img) => img.category === 'tac');
  const pendingXray = pendingUploads.filter((u) => u.category === 'xray');
  const pendingTac = pendingUploads.filter((u) => u.category === 'tac');

  const isSaving = createMutation.isPending || updateMutation.isPending || uploadImageMutation.isPending;
  const canPublish = isEditing && existingStudy?.status === 'draft';

  if (isEditing && isLoadingStudy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-semibold text-xl tracking-tight">Anklyze</span>
            <Badge variant="secondary" className="ml-2">
              Admin
            </Badge>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/studies')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? t('admin.studies.editStudy') : t('admin.studies.createStudy')}
            </h1>
            {existingStudy && (
              <Badge className="mt-1" variant="outline">
                {t(`studies.status.${existingStudy.status}`)}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t('common.save')}
            </Button>
            {canPublish && (
              <Button onClick={handlePublish} disabled={isSaving}>
                <Send className="h-4 w-4 mr-2" />
                {t('admin.studies.publish')}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Study Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('admin.studies.details')}</CardTitle>
            <CardDescription>{t('admin.studies.detailsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('studies.title')} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('admin.studies.titlePlaceholder')}
                disabled={existingStudy?.status !== 'draft' && isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('studies.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('admin.studies.descriptionPlaceholder')}
                rows={4}
                disabled={existingStudy?.status !== 'draft' && isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">{t('studies.deadline')} ({t('common.optional')})</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={existingStudy?.status !== 'draft' && isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Images Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.studies.images')}</CardTitle>
            <CardDescription>{t('admin.studies.imagesDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Upload Area - only show for draft studies */}
            {(!isEditing || existingStudy?.status === 'draft') && (
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <Label>{t('admin.studies.uploadCategory')}</Label>
                  <Select
                    value={uploadCategory}
                    onValueChange={(value) => setUploadCategory(value as ImageCategory)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xray">{t('studies.images.xray')}</SelectItem>
                      <SelectItem value="tac">{t('studies.images.tac')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {isDragActive
                      ? t('admin.studies.dropHere')
                      : t('admin.studies.dragOrClick')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('admin.studies.maxFileSize')}
                  </p>
                </div>
              </div>
            )}

            {/* Images Tabs */}
            <Tabs defaultValue="xray" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="xray">
                  {t('studies.images.xray')} ({xrayImages.length + pendingXray.length})
                </TabsTrigger>
                <TabsTrigger value="tac">
                  {t('studies.images.tac')} ({tacImages.length + pendingTac.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="xray" className="mt-4">
                <ImageGrid
                  existingImages={xrayImages}
                  pendingUploads={pendingXray}
                  onRemovePending={removePendingUpload}
                  onUpdateCaption={updatePendingCaption}
                  onDeleteExisting={(imageId) =>
                    deleteImageMutation.mutate({ studyId: id!, imageId })
                  }
                  canEdit={!isEditing || existingStudy?.status === 'draft'}
                  studyId={id}
                />
              </TabsContent>

              <TabsContent value="tac" className="mt-4">
                <ImageGrid
                  existingImages={tacImages}
                  pendingUploads={pendingTac}
                  onRemovePending={removePendingUpload}
                  onUpdateCaption={updatePendingCaption}
                  onDeleteExisting={(imageId) =>
                    deleteImageMutation.mutate({ studyId: id!, imageId })
                  }
                  canEdit={!isEditing || existingStudy?.status === 'draft'}
                  studyId={id}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.studies.publishConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.studies.publishConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish}>
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t('admin.studies.publish')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ImageGridProps {
  existingImages: StudyImage[];
  pendingUploads: PendingUpload[];
  onRemovePending: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onDeleteExisting: (imageId: string) => void;
  canEdit: boolean;
  studyId?: string;
}

function ImageGrid({
  existingImages,
  pendingUploads,
  onRemovePending,
  onUpdateCaption,
  onDeleteExisting,
  canEdit,
  studyId,
}: ImageGridProps) {
  const { t } = useTranslation();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs for existing images (using admin endpoint for draft studies)
  const fetchImageUrl = async (image: StudyImage) => {
    if (!studyId || imageUrls[image.id]) return;
    try {
      const url = await studyApi.getAdminImageUrl(studyId, image.id);
      setImageUrls((prev) => ({ ...prev, [image.id]: url }));
    } catch (error) {
      console.error('Failed to fetch image URL:', error);
    }
  };

  if (existingImages.length === 0 && pendingUploads.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('admin.studies.noImages')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {/* Existing images */}
      {existingImages.map((image) => {
        if (!imageUrls[image.id]) {
          fetchImageUrl(image);
        }
        return (
          <div key={image.id} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
              {imageUrls[image.id] ? (
                <img
                  src={imageUrls[image.id]}
                  alt={image.caption || 'Study image'}
                  className="w-full h-full object-cover"
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
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDeleteExisting(image.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {image.caption && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{image.caption}</p>
            )}
          </div>
        );
      })}

      {/* Pending uploads */}
      {pendingUploads.map((upload) => (
        <div key={upload.id} className="relative group">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-dashed border-primary/50">
            <img
              src={upload.preview}
              alt="Pending upload"
              className="w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Badge variant="secondary">{t('admin.studies.pending')}</Badge>
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onRemovePending(upload.id)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Input
            className="mt-2 text-xs"
            placeholder={t('admin.studies.captionPlaceholder')}
            value={upload.caption}
            onChange={(e) => onUpdateCaption(upload.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
