import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '../components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  getPublishedStudy,
  getImageSignedURL,
  submitStudyResponse,
  getMyResponses,
} from '../services/studyApi';
import { classifyFracture } from '../services/api';
import type { FractureInput, ClassificationResult } from '../types/fracture';
import {
  ImageGrid,
  ImageLightbox,
  StudyHeader,
  PreviousResponses,
  ClassificationPanel,
} from '../components/studies';

export function StudyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Image gallery state
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'xray' | 'tac'>('xray');
  const [prevStudyId, setPrevStudyId] = useState<string | undefined>(undefined);

  // Classification state
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Time tracking - initialized in useEffect to avoid impure function call during render
  const startTimeRef = useRef<number>(0);
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  // Fetch study data with React Query
  const { data: study, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['published-study', id],
    queryFn: () => getPublishedStudy(id!),
    enabled: !!id,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load study' : null;

  // Set initial tab based on available images (only once when study loads)
  // This pattern is recommended by React for syncing state with props during render
  if (study && study.id !== prevStudyId) {
    setPrevStudyId(study.id);
    const hasXray = study.images.some((img) => img.category === 'xray');
    const hasTac = study.images.some((img) => img.category === 'tac');
    if (!hasXray && hasTac) {
      setActiveTab('tac');
    } else {
      setActiveTab('xray');
    }
  }

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

  // Fetch previous responses with React Query
  const { data: responsesData } = useQuery({
    queryKey: ['my-responses', id],
    queryFn: () => getMyResponses(id!),
    enabled: !!id && !!study?.has_responded,
  });

  const myResponses = responsesData?.responses ?? [];

  // Group images by category
  const xrayImages = study?.images.filter((img) => img.category === 'xray') || [];
  const tacImages = study?.images.filter((img) => img.category === 'tac') || [];
  const currentImages = activeTab === 'xray' ? xrayImages : tacImages;

  // Handle classification form submission
  const handleClassify = useCallback(async (input: FractureInput) => {
    const result = await classifyFracture(input);
    setClassificationResult(result);
    return result;
  }, []);

  // Handle response submission with mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!classificationResult || !id) throw new Error('Missing data');
      const timeTakenMs = Date.now() - startTimeRef.current;
      return submitStudyResponse(id, {
        classification: classificationResult,
        time_taken_ms: timeTakenMs,
      });
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      toast.success(t('studies.submitSuccess'), {
        description: t('studies.submitSuccessDescription'),
      });
      // Invalidate all related queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['published-study', id] });
      queryClient.invalidateQueries({ queryKey: ['published-studies'] });
      queryClient.invalidateQueries({ queryKey: ['my-responses', id] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit response';
      setSubmitError(errorMessage);
      toast.error(t('studies.submitError'), {
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
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {error || t('studies.notFound')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const deadline = study.deadline ? new Date(study.deadline) : null;
  const isExpired = deadline && deadline < new Date();

  return (
    <div className="h-full">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left column - Study info and images */}
          <div className="space-y-6">
            <StudyHeader
              title={study.title}
              description={study.description}
              hasTACImages={study.has_tac_images}
              myResponseCount={study.my_response_count}
              deadline={study.deadline}
            />

            {/* Image gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {t('studies.imageGallery')}
                </CardTitle>
              </CardHeader>
              <CardContent>
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

            <PreviousResponses responses={myResponses} />
          </div>

          {/* Right column - Classification form */}
          <div className="space-y-6">
            <ClassificationPanel
              hasTACImages={study.has_tac_images}
              classificationResult={classificationResult}
              submitting={submitMutation.isPending}
              submitError={submitError}
              submitSuccess={submitSuccess}
              isExpired={!!isExpired}
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
