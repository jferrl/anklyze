import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Spinner } from '../components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  getPublishedCase,
  submitCaseResponse,
  getMyResponses,
  classifyFracture,
  ForbiddenError,
} from '@/services';
import { buildSubmitResponseRequest } from '../services/study/responsePayload';
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
import { useRecordTitle } from '@/components/layout/recordTitle';

// Wrapper extracts route param and keys the inner component by id,
// so React resets all state automatically when navigating between cases.
export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <CaseDetailContent key={id} id={id} />;
}

function CaseDetailContent({ id }: { id: string | undefined }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Case navigation (prev/next/position)
  const caseNav = useCaseNavigation(id);

  // Batch-fetch all signed URLs for this case (single request, cached by React Query)
  const { imageUrls, isLoading: isLoadingUrls } = useImageUrls(id);

  // Large image per category, kept when switching tabs; the lightbox opens on and moves this index.
  const [galleryIndex, setGalleryIndex] = useState({ xray: 0, tac: 0 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // User's explicit tab choice; null means "use default based on available images"
  const [tabOverride, setTabOverride] = useState<'xray' | 'tac' | null>(null);

  // Classification state
  const [classification, setClassification] = useState<{
    result: ClassificationResult | null;
    input: FractureInput | null;
    tracking: AnswerTracking | null;
  }>({ result: null, input: null, tracking: null });

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
  useRecordTitle(caseData?.title);

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
    setClassification({ result, input, tracking: tracking ?? null });
    return result;
  }, []);

  // Handle response submission with mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!classification.result || !classification.input || !id) throw new Error(t('cases.missingData'));
      const timeTakenMs = Date.now() - startTimeRef.current;
      return submitCaseResponse(
        id,
        buildSubmitResponseRequest(classification.input, classification.result, timeTakenMs, classification.tracking),
      );
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
      // 403 codes (STUDY_CLOSED, DEADLINE_PASSED, ...) have translations under errors.*
      const errorMessage =
        err instanceof ForbiddenError && err.code
          ? t(`errors.${err.code}`, { defaultValue: err.message })
          : err instanceof Error
            ? err.message
            : t('cases.submitResponseError');
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
    setClassification({ result: null, input: null, tracking: null });
    setSubmitState({ status: 'idle' });
    startTimeRef.current = Date.now();
  }, []);

  // After submitting: the next pending case, or back to the list when none is left; filters are kept.
  const filterParams = new URLSearchParams();
  const status = searchParams.get('status');
  const q = searchParams.get('q');
  if (status && status !== 'all') filterParams.set('status', status);
  if (q) filterParams.set('q', q);
  const qs = filterParams.toString() ? `?${filterParams}` : '';
  const afterSubmitHref = caseNav.nextPendingCase ? `/cases/${caseNav.nextPendingCase.id}${qs}` : `/cases${qs}`;

  const setTabIndex = (tab: 'xray' | 'tac') => (index: number) =>
    setGalleryIndex((prev) => ({ ...prev, [tab]: index }));
  const openLightbox = (index: number) => {
    setTabIndex(activeTab)(index);
    setLightboxOpen(true);
  };
  const nextImage = () =>
    setGalleryIndex((prev) => ({ ...prev, [activeTab]: Math.min(prev[activeTab] + 1, currentImages.length - 1) }));
  const prevImage = () =>
    setGalleryIndex((prev) => ({ ...prev, [activeTab]: Math.max(prev[activeTab] - 1, 0) }));

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
                    index={galleryIndex.xray}
                    onIndexChange={setTabIndex('xray')}
                    onImageClick={openLightbox}
                  />
                </TabsContent>

                <TabsContent value="tac" className="mt-0">
                  <ImageGrid
                    images={tacImages}
                    imageUrls={imageUrls}
                    isLoadingUrls={isLoadingUrls}
                    index={galleryIndex.tac}
                    onIndexChange={setTabIndex('tac')}
                    onImageClick={openLightbox}
                  />
                </TabsContent>
            </Tabs>
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
            nextHref={afterSubmitHref}
            hasNextCase={!!caseNav.nextPendingCase}
          />
          <PreviousResponses responses={myResponses} />
        </div>
      </div>

      {/* Image lightbox */}
      {lightboxOpen && currentImages.length > 0 && (
        <ImageLightbox
          images={currentImages}
          imageUrls={imageUrls}
          currentIndex={Math.min(galleryIndex[activeTab], currentImages.length - 1)}
          onClose={() => setLightboxOpen(false)}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>
  );
}
