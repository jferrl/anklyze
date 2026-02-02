import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '../components/ui/spinner';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  getPublishedCase,
  getImageSignedURL,
  submitCaseResponse,
  getMyResponses,
} from '../services/studyApi';
import { classifyFracture } from '../services/api';
import type { FractureInput, ClassificationResult } from '../types/fracture';
import type { SubmitResponseResult, UserCaseDetail } from '../types/study';
import {
  ImageGrid,
  ImageLightbox,
  CaseHeader,
  PreviousResponses,
  ClassificationPanel,
} from '../components/cases';
import type { AnswerTracking } from '../components/cases';

export function CaseDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Image gallery state
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'xray' | 'tac'>('xray');
  const [prevCaseId, setPrevCaseId] = useState<string | undefined>(undefined);

  // Classification state
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [answerTracking, setAnswerTracking] = useState<AnswerTracking | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResponseResult | null>(null);

  // Time tracking - initialized in useEffect to avoid impure function call during render
  const startTimeRef = useRef<number>(0);
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  // Fetch case data with React Query
  const { data: caseData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['published-case', id],
    queryFn: () => getPublishedCase(id!),
    enabled: !!id,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load case' : null;

  // Set initial tab based on available images (only once when case loads)
  // This pattern is recommended by React for syncing state with props during render
  if (caseData && caseData.id !== prevCaseId) {
    setPrevCaseId(caseData.id);
    const hasXray = caseData.images.some((img) => img.category === 'xray');
    const hasTac = caseData.images.some((img) => img.category === 'tac');
    if (!hasXray && hasTac) {
      setActiveTab('tac');
    } else {
      setActiveTab('xray');
    }
  }

  // Fetch signed URLs for images
  useEffect(() => {
    async function fetchImageUrls() {
      if (!caseData || !id) return;

      setLoadingImages(true);
      const urls: Record<string, string> = {};

      await Promise.all(
        caseData.images.map(async (image) => {
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
  }, [caseData, id]);

  // Fetch previous responses with React Query
  const { data: responsesData } = useQuery({
    queryKey: ['my-responses', id],
    queryFn: () => getMyResponses(id!),
    enabled: !!id && !!caseData?.has_responded,
  });

  const myResponses = responsesData?.responses ?? [];

  // Group images by category
  const xrayImages = caseData?.images.filter((img) => img.category === 'xray') || [];
  const tacImages = caseData?.images.filter((img) => img.category === 'tac') || [];
  const currentImages = activeTab === 'xray' ? xrayImages : tacImages;

  // Handle classification form submission
  const handleClassify = useCallback(async (input: FractureInput, tracking?: AnswerTracking) => {
    const result = await classifyFracture(input);
    setClassificationResult(result);
    if (tracking) {
      setAnswerTracking(tracking);
    }
    return result;
  }, []);

  // Handle response submission with mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!classificationResult || !id) throw new Error('Missing data');
      const timeTakenMs = Date.now() - startTimeRef.current;
      return submitCaseResponse(id, {
        classification: classificationResult,
        time_taken_ms: timeTakenMs,
        // Include tracking data for divergence analysis
        ...(answerTracking && {
          answer_path: answerTracking.answerPath,
          decision_path: answerTracking.decisionPath,
          time_per_question: answerTracking.timePerQuestion,
          back_clicks: answerTracking.backClicks,
        }),
      });
    },
    onSuccess: (result) => {
      setSubmitSuccess(true);
      setSubmitResult(result);

      // Show different message based on gold standard comparison
      if (result.reference_classification) {
        const allMatch =
          result.matches_danis_weber !== false &&
          result.matches_lauge_hansen !== false &&
          result.matches_ao_ota !== false &&
          result.matches_bartonicek !== false;

        if (allMatch) {
          toast.success(t('cases.submitSuccess'), {
            description: t('cases.matchesReference', 'Your classification matches the reference!'),
          });
        } else {
          toast.info(t('cases.submitSuccess'), {
            description: t('cases.submitSuccessDescription'),
          });
        }
      } else {
        toast.success(t('cases.submitSuccess'), {
          description: t('cases.submitSuccessDescription'),
        });
      }

      // Optimistically update the cache to immediately reflect that user has responded
      // This prevents any race conditions where stale cache data could allow re-submission
      queryClient.setQueryData(['published-case', id], (oldData: UserCaseDetail | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          has_responded: true,
          my_response_count: oldData.my_response_count + 1,
        };
      });

      // Invalidate all related queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['published-case', id] });
      queryClient.invalidateQueries({ queryKey: ['published-cases'] });
      queryClient.invalidateQueries({ queryKey: ['my-responses', id] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit response';
      setSubmitError(errorMessage);
      toast.error(t('cases.submitError'), {
        description: errorMessage,
      });
    },
  });

  const handleSubmitResponse = useCallback(() => {
    if (!classificationResult || !id) return;
    setSubmitError(null);
    submitMutation.mutate();
  }, [classificationResult, id, submitMutation]);

  // Reset for re-answer
  const handleReanswer = useCallback(() => {
    setClassificationResult(null);
    setAnswerTracking(null);
    setSubmitSuccess(false);
    setSubmitError(null);
    setSubmitResult(null);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-12 text-center text-muted-foreground">
            {error || t('cases.notFound')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const deadline = caseData.deadline ? new Date(caseData.deadline) : null;
  const isExpired = caseData.is_expired || (deadline && deadline < new Date());

  // Check if user can submit based on single response mode
  const cannotSubmit = !caseData.allow_multiple_responses && caseData.has_responded;
  const canReanswer = caseData.allow_multiple_responses;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section with Case Info */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <CaseHeader
            title={caseData.title}
            description={caseData.description}
            hasTACImages={caseData.has_tac_images}
            myResponseCount={caseData.my_response_count}
            deadline={caseData.deadline}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left column - Images (takes more space) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image gallery with modern styling */}
            <div className="sticky top-4">
              <Card className="overflow-hidden border-border/50 shadow-lg">
                <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      {t('cases.imageGallery')}
                    </h2>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ZoomIn className="h-3 w-3" />
                      {t('cases.clickToEnlarge')}
                    </span>
                  </div>
                </div>
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'xray' | 'tac')}>
                    <div className="px-4 pt-4">
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="xray" disabled={xrayImages.length === 0} className="gap-2">
                          X-Ray
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{xrayImages.length}</span>
                        </TabsTrigger>
                        <TabsTrigger value="tac" disabled={tacImages.length === 0} className="gap-2">
                          TAC
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{tacImages.length}</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="xray" className="mt-0 p-4">
                      <ImageGrid
                        images={xrayImages}
                        imageUrls={imageUrls}
                        loading={loadingImages}
                        onImageClick={openLightbox}
                      />
                    </TabsContent>

                    <TabsContent value="tac" className="mt-0 p-4">
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

              {/* Previous Responses - only show if there are responses */}
              {myResponses.length > 0 && (
                <div className="mt-6">
                  <PreviousResponses responses={myResponses} />
                </div>
              )}
            </div>
          </div>

          {/* Right column - Classification form (main focus) */}
          <div className="lg:col-span-3">
            <ClassificationPanel
              hasTACImages={caseData.has_tac_images}
              classificationResult={classificationResult}
              submitting={submitMutation.isPending}
              submitError={submitError}
              submitSuccess={submitSuccess}
              isExpired={!!isExpired}
              cannotSubmit={cannotSubmit}
              canReanswer={canReanswer}
              submitResult={submitResult}
              onClassify={handleClassify}
              onSubmit={handleSubmitResponse}
              onReanswer={handleReanswer}
            />
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
