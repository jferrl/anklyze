import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
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
import type { UserStudyDetail, StudyResponse } from '../types/study';
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
    const result = await classifyFracture(input);
    setClassificationResult(result);
    return result;
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
      toast.success(t('studies.submitSuccess'), {
        description: t('studies.submitSuccessDescription'),
      });

      // Refresh study data to update response counts
      const updatedStudy = await getPublishedStudy(id);
      setStudy(updatedStudy);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit response';
      setSubmitError(errorMessage);
      toast.error(t('studies.submitError'), {
        description: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }, [classificationResult, id, t]);

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
              submitting={submitting}
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
