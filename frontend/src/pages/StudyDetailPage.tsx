import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Users,
  CheckCircle2,
  ImageIcon,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { UserMenu } from '../components/auth/UserMenu';
import {
  getPublishedStudy,
  getImageSignedURL,
  submitStudyResponse,
  getMyResponses,
} from '../services/studyApi';
import { classifyFracture } from '../services/api';
import type { UserStudyDetail, StudyImageInfo, StudyResponse } from '../types/study';
import type { FractureInput, ClassificationResult } from '../types/fracture';
import { StudyClassificationForm } from '../components/studies/StudyClassificationForm';
import { ClassificationResult as ClassificationResultComponent } from '../components/ClassificationResult';

export function StudyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [study, setStudy] = useState<UserStudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Image gallery state
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'xray' | 'tac'>('xray');

  // Classification state
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Time tracking
  const startTimeRef = useRef<number>(Date.now());

  // Previous responses
  const [myResponses, setMyResponses] = useState<StudyResponse[]>([]);
  const [showPreviousResponses, setShowPreviousResponses] = useState(false);

  // Fetch study data
  useEffect(() => {
    async function fetchStudy() {
      if (!id) return;

      try {
        setLoading(true);
        const data = await getPublishedStudy(id);
        setStudy(data);

        // Determine initial tab based on available images
        const hasXray = data.images.some((img) => img.category === 'xray');
        const hasTac = data.images.some((img) => img.category === 'tac');
        if (!hasXray && hasTac) {
          setActiveTab('tac');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load study');
      } finally {
        setLoading(false);
      }
    }

    fetchStudy();
  }, [id]);

  // Fetch signed URLs for images
  useEffect(() => {
    async function fetchImageUrls() {
      if (!study || !id) return;

      setLoadingImages(true);
      const urls: Record<string, string> = {};

      await Promise.all(
        study.images.map(async (image) => {
          try {
            const response = await getImageSignedURL(id, image.id);
            urls[image.id] = response.url;
          } catch (err) {
            console.error(`Failed to load image ${image.id}:`, err);
          }
        })
      );

      setImageUrls(urls);
      setLoadingImages(false);
    }

    fetchImageUrls();
  }, [study, id]);

  // Fetch previous responses
  useEffect(() => {
    async function fetchMyResponses() {
      if (!id || !study?.has_responded) return;

      try {
        const data = await getMyResponses(id);
        setMyResponses(data.responses);
      } catch (err) {
        console.error('Failed to load previous responses:', err);
      }
    }

    fetchMyResponses();
  }, [id, study?.has_responded]);

  // Group images by category
  const xrayImages = study?.images.filter((img) => img.category === 'xray') || [];
  const tacImages = study?.images.filter((img) => img.category === 'tac') || [];
  const currentImages = activeTab === 'xray' ? xrayImages : tacImages;

  // Handle classification form submission
  const handleClassify = useCallback(async (input: FractureInput) => {
    try {
      const result = await classifyFracture(input);
      setClassificationResult(result);
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  // Handle response submission
  const handleSubmitResponse = useCallback(async () => {
    if (!classificationResult || !id) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const timeTakenMs = Date.now() - startTimeRef.current;

      await submitStudyResponse(id, {
        classification: classificationResult,
        time_taken_ms: timeTakenMs,
      });

      setSubmitSuccess(true);

      // Refresh study data to update response counts
      const updatedStudy = await getPublishedStudy(id);
      setStudy(updatedStudy);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  }, [classificationResult, id]);

  // Reset for re-answer
  const handleReanswer = useCallback(() => {
    setClassificationResult(null);
    setSubmitSuccess(false);
    setSubmitError(null);
    startTimeRef.current = Date.now();
  }, []);

  // Image lightbox navigation
  const openLightbox = (index: number) => setSelectedImageIndex(index);
  const closeLightbox = () => setSelectedImageIndex(null);
  const nextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < currentImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };
  const prevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <Button variant="ghost" onClick={() => navigate('/studies')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {error || t('studies.notFound')}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const deadline = study.deadline ? new Date(study.deadline) : null;
  const isExpired = deadline && deadline < new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/studies')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('studies.backToList')}
            </Button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left column - Study info and images */}
          <div className="space-y-6">
            {/* Study header */}
            <div>
              <h1 className="text-2xl font-bold mb-2">{study.title}</h1>
              {study.description && (
                <p className="text-muted-foreground">{study.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                {study.has_tac_images && (
                  <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950">
                    {t('studies.includesTAC')}
                  </Badge>
                )}
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {study.my_response_count} {t('studies.myResponses')}
                </Badge>
                {deadline && (
                  <Badge variant={isExpired ? 'destructive' : 'outline'}>
                    <Clock className="h-3 w-3 mr-1" />
                    {isExpired
                      ? t('studies.expired')
                      : `${t('studies.deadline')}: ${deadline.toLocaleDateString()}`
                    }
                  </Badge>
                )}
              </div>
            </div>

            {/* Image gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t('studies.imageGallery')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Tabs for X-ray and TAC */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'xray' | 'tac')}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="xray" disabled={xrayImages.length === 0}>
                      X-Ray ({xrayImages.length})
                    </TabsTrigger>
                    <TabsTrigger value="tac" disabled={tacImages.length === 0}>
                      TAC ({tacImages.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="xray" className="mt-0">
                    <ImageGrid
                      images={xrayImages}
                      imageUrls={imageUrls}
                      loading={loadingImages}
                      onImageClick={openLightbox}
                    />
                  </TabsContent>

                  <TabsContent value="tac" className="mt-0">
                    <ImageGrid
                      images={tacImages}
                      imageUrls={imageUrls}
                      loading={loadingImages}
                      onImageClick={openLightbox}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Previous responses */}
            {myResponses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowPreviousResponses(!showPreviousResponses)}
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      {t('studies.previousResponses')} ({myResponses.length})
                    </span>
                    <ChevronRight
                      className={`h-5 w-5 transition-transform ${
                        showPreviousResponses ? 'rotate-90' : ''
                      }`}
                    />
                  </CardTitle>
                </CardHeader>
                {showPreviousResponses && (
                  <CardContent>
                    <div className="space-y-4">
                      {myResponses.map((response, index) => (
                        <div
                          key={response.id}
                          className="border rounded-lg p-4 text-sm"
                        >
                          <div className="text-muted-foreground mb-2">
                            {t('studies.response')} #{myResponses.length - index} -{' '}
                            {new Date(response.created_at).toLocaleString()}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {response.classification.danis_weber && (
                              <div>
                                <span className="font-medium">Danis-Weber:</span>{' '}
                                {response.classification.danis_weber.type}
                              </div>
                            )}
                            {response.classification.lauge_hansen && (
                              <div>
                                <span className="font-medium">Lauge-Hansen:</span>{' '}
                                {response.classification.lauge_hansen.type}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          {/* Right column - Classification form */}
          <div className="space-y-6">
            {isExpired ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('studies.studyExpired')}</AlertTitle>
                <AlertDescription>
                  {t('studies.studyExpiredDescription')}
                </AlertDescription>
              </Alert>
            ) : submitSuccess ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t('studies.responseSubmitted')}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t('studies.responseSubmittedDescription')}
                  </p>
                  <Button onClick={handleReanswer}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('studies.submitAnother')}
                  </Button>
                </CardContent>
              </Card>
            ) : classificationResult ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('studies.classificationResult')}</CardTitle>
                    <CardDescription>
                      {t('studies.reviewAndSubmit')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ClassificationResultComponent result={classificationResult} />
                  </CardContent>
                </Card>

                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handleReanswer}
                    disabled={submitting}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('studies.changeAnswer')}
                  </Button>
                  <Button
                    onClick={handleSubmitResponse}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    {t('studies.submitResponse')}
                  </Button>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t('studies.classifyFracture')}</CardTitle>
                  <CardDescription>
                    {t('studies.classifyFractureDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StudyClassificationForm
                    hasTACImages={study.has_tac_images}
                    onClassify={handleClassify}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {selectedImageIndex !== null && (
        <ImageLightbox
          images={currentImages}
          imageUrls={imageUrls}
          currentIndex={selectedImageIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>
  );
}

// Image grid component
interface ImageGridProps {
  images: StudyImageInfo[];
  imageUrls: Record<string, string>;
  loading: boolean;
  onImageClick: (index: number) => void;
}

function ImageGrid({ images, imageUrls, loading, onImageClick }: ImageGridProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('studies.noImagesInCategory')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => onImageClick(index)}
        >
          {imageUrls[image.id] ? (
            <img
              src={imageUrls[image.id]}
              alt={image.caption || image.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Image lightbox component
interface ImageLightboxProps {
  images: StudyImageInfo[];
  imageUrls: Record<string, string>;
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

function ImageLightbox({
  images,
  imageUrls,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}: ImageLightboxProps) {
  const currentImage = images[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          className="absolute left-4 text-white/70 hover:text-white p-2"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {currentIndex < images.length - 1 && (
        <button
          className="absolute right-4 text-white/70 hover:text-white p-2"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {imageUrls[currentImage.id] ? (
          <img
            src={imageUrls[currentImage.id]}
            alt={currentImage.caption || currentImage.filename}
            className="max-w-full max-h-[85vh] object-contain"
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Caption */}
        {currentImage.caption && (
          <p className="text-white/80 mt-4 text-center">{currentImage.caption}</p>
        )}

        {/* Counter */}
        <p className="text-white/60 mt-2 text-sm">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
