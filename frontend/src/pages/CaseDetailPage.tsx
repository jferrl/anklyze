import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Spinner } from '../components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  getPublishedCase,
  submitCaseResponse,
  getMyResponses,
  classifyFracture,
} from '@/services';
import type { FractureInput, ClassificationResult } from '@/types';
import type { UserCaseDetail } from '@/types';
import {
  ImageGrid,
  ImageLightbox,
  CaseHeader,
  PreviousResponses,
  ClassificationPanel,
} from '../components/cases';
import { CaseNavigationBar } from '../components/cases/CaseNavigationBar';
import type { AnswerTracking } from '../components/cases';
import { useImageUrls } from '../hooks/useImageUrls';
import { useCaseNavigation } from '../hooks/useCaseNavigation';

// Wrapper extracts route param and keys the inner component by id,
// so React resets all state automatically when navigating between cases.
export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <CaseDetailContent key={id} id={id} />;
}

function CaseDetailContent({ id }: { id: string | undefined }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Case navigation (prev/next/position)
  const caseNav = useCaseNavigation(id);

  // Batch-fetch all signed URLs for this case (single request, cached by React Query)
  const { imageUrls, isLoading: isLoadingUrls } = useImageUrls(id);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // User's explicit tab choice; null means "use default based on available images"
  const [tabOverride, setTabOverride] = useState<'xray' | 'tac' | null>(null);

  // Classification state
  const [classification, setClassification] = useState<{
    result: ClassificationResult | null;
    tracking: AnswerTracking | null;
  }>({ result: null, tracking: null });

  // Submit state as discriminated union
  type SubmitState =
    | { status: 'idle' }
    | { status: 'error'; error: string }
    | { status: 'success' };
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });

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

  const error = queryError instanceof Error ? queryError.message : queryError ? t('cases.loadError') : null;

  // Derive active tab: user override takes precedence, otherwise default based on images
  const defaultTab = (() => {
    if (!caseData) return 'xray';
    const hasXray = caseData.images.some((img) => img.category === 'xray');
    const hasTac = caseData.images.some((img) => img.category === 'tac');
    return !hasXray && hasTac ? 'tac' : 'xray';
  })();
  const activeTab = tabOverride ?? defaultTab;
  const setActiveTab = (tab: 'xray' | 'tac') => setTabOverride(tab);

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
    setClassification({ result, tracking: tracking ?? null });
    return result;
  }, []);

  // Handle response submission with mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!classification.result || !id) throw new Error(t('cases.missingData'));
      const timeTakenMs = Date.now() - startTimeRef.current;
      return submitCaseResponse(id, {
        classification: classification.result,
        time_taken_ms: timeTakenMs,
        // Include tracking data for analytics
        ...(classification.tracking && {
          answer_path: classification.tracking.answerPath,
          decision_path: classification.tracking.decisionPath,
          time_per_question: classification.tracking.timePerQuestion,
          back_clicks: classification.tracking.backClicks,
        }),
      });
    },
    onSuccess: () => {
      setSubmitState({ status: 'success' });

      toast.success(t('cases.submitSuccess'), {
        description: t('cases.submitSuccessDescription'),
      });

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
      queryClient.invalidateQueries({ queryKey: ['case-navigation'] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : t('cases.submitResponseError');
      setSubmitState({ status: 'error', error: errorMessage });
      toast.error(t('cases.submitError'), {
        description: errorMessage,
      });
    },
  });

  const handleSubmitResponse = useCallback(() => {
    if (!classification.result || !id) return;
    setSubmitState({ status: 'idle' });
    submitMutation.mutate();
  }, [classification.result, id, submitMutation]);

  // Reset for re-answer
  const handleReanswer = useCallback(() => {
    setClassification({ result: null, tracking: null });
    setSubmitState({ status: 'idle' });
    startTimeRef.current = Date.now();
  }, []);

  // Navigate to next pending case
  const handleNextCase = useCallback(() => {
    if (!caseNav.nextPendingCase) return;
    const params = new URLSearchParams();
    const status = searchParams.get('status');
    const q = searchParams.get('q');
    if (status && status !== 'all') params.set('status', status);
    if (q) params.set('q', q);
    const qs = params.toString();
    navigate(`/cases/${caseNav.nextPendingCase.id}${qs ? `?${qs}` : ''}`);
  }, [caseNav.nextPendingCase, navigate, searchParams]);

  // Image lightbox navigation
  const openLightbox = (index: number) => setSelectedImageIndex(index);
  const closeLightbox = () => setSelectedImageIndex(null);
  const nextImage = () => {
    setSelectedImageIndex(prev =>
      prev !== null && prev < currentImages.length - 1 ? prev + 1 : prev
    );
  };
  const prevImage = () => {
    setSelectedImageIndex(prev =>
      prev !== null && prev > 0 ? prev - 1 : prev
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
          {error || t('cases.notFound')}
        </div>
      </div>
    );
  }

  const deadline = caseData.deadline ? new Date(caseData.deadline) : null;
  const isExpired = caseData.is_expired || (deadline && deadline < new Date());

  // Single response mode: user cannot submit again once they have responded
  const cannotSubmit = caseData.has_responded;
  const canReanswer = false;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <CaseNavigationBar
        prevCase={caseNav.prevCase}
        nextCase={caseNav.nextCase}
        currentIndex={caseNav.currentIndex}
        totalFiltered={caseNav.totalFiltered}
        isLoading={caseNav.isLoading}
      />

      <CaseHeader
        title={caseData.title}
        description={caseData.description}
        hasTACImages={caseData.has_tac_images}
        myResponseCount={caseData.my_response_count}
        deadline={caseData.deadline}
      />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Images: the larger column, kept in view while answering */}
        <div className="lg:sticky lg:top-16 lg:self-start">
          <section className="overflow-hidden rounded-lg border bg-card">
            {caseData.images.length === 0 ? (
              <>
                <h2 className="border-b px-4 py-3 text-base font-semibold">{t('cases.imageGallery')}</h2>
                <p className="px-4 py-3 text-sm text-muted-foreground">{t('cases.noImages')}</p>
              </>
            ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'xray' | 'tac')}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <h2 className="text-base font-semibold">{t('cases.imageGallery')}</h2>
                <TabsList>
                  <TabsTrigger value="xray" disabled={xrayImages.length === 0} className="gap-1.5">
                    {t('cases.images.xray')}
                    <span className="text-xs text-muted-foreground tabular-nums">{xrayImages.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="tac" disabled={tacImages.length === 0} className="gap-1.5">
                    {t('cases.images.ct')}
                    <span className="text-xs text-muted-foreground tabular-nums">{tacImages.length}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

                <TabsContent value="xray" className="mt-0">
                  <ImageGrid
                    images={xrayImages}
                    imageUrls={imageUrls}
                    isLoadingUrls={isLoadingUrls}
                    onImageClick={openLightbox}
                  />
                </TabsContent>

                <TabsContent value="tac" className="mt-0">
                  <ImageGrid
                    images={tacImages}
                    imageUrls={imageUrls}
                    isLoadingUrls={isLoadingUrls}
                    onImageClick={openLightbox}
                  />
                </TabsContent>
            </Tabs>
            )}
            {currentImages.length > 0 && (
              <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                {t('cases.clickToEnlarge')}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <ClassificationPanel
            hasTACImages={caseData.has_tac_images}
            classificationResult={classification.result}
            submitting={submitMutation.isPending}
            submitError={submitState.status === 'error' ? submitState.error : null}
            submitSuccess={submitState.status === 'success'}
            isExpired={!!isExpired}
            cannotSubmit={cannotSubmit}
            canReanswer={canReanswer}
            onClassify={handleClassify}
            onSubmit={handleSubmitResponse}
            onReanswer={handleReanswer}
            onNextCase={handleNextCase}
            hasNextCase={!!caseNav.nextPendingCase}
          />
          <PreviousResponses responses={myResponses} />
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
