import { Badge } from '@/components/ui';
import { getLocalFormOptions } from '@/utils/formOptions';
import type { FractureInput } from '@/types';

interface BreadcrumbTrailProps {
  formData: Partial<FractureInput>;
  options: ReturnType<typeof getLocalFormOptions>;
}

/**
 * Build the ordered breadcrumb trail of answered questions
 */
function getBreadcrumbTrail(
  formData: Partial<FractureInput>,
  options: ReturnType<typeof getLocalFormOptions>,
): { label: string; key: string }[] {
  const trail: { label: string; key: string }[] = [];

  // Involved malleoli (always first)
  if (formData.involved_malleoli) {
    const option = options.involved_malleoli?.find(
      opt => opt.value === formData.involved_malleoli
    );
    if (option) trail.push({ label: option.label, key: 'involved_malleoli' });
  }

  // Fibular level
  if (formData.fibular_level) {
    const isLMOrTri = ['lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli || '');
    const levelOptions = isLMOrTri ? options.fibular_level_high_low : options.fibular_levels;
    const option = levelOptions?.find(
      opt => opt.value === formData.fibular_level
    );
    if (option) trail.push({ label: option.label, key: 'fibular_level' });
  }

  // Lateral morphology
  if (formData.lateral_morphology) {
    const isLMOrTri = ['lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli || '');
    const morphOptions = isLMOrTri ? options.fibula_morphology_lm_tri : options.lateral_morphology;
    const option = morphOptions?.find(
      opt => opt.value === formData.lateral_morphology
    );
    if (option) trail.push({ label: option.label, key: 'lateral_morphology' });
  }

  // Suprasindesmal type
  if (formData.suprasindesmal_type) {
    const option = options.suprasindesmal_types?.find(
      opt => opt.value === formData.suprasindesmal_type
    );
    if (option) trail.push({ label: option.label, key: 'suprasindesmal_type' });
  }

  // Medial morphology
  if (formData.medial_morphology) {
    const option = options.medial_morphology?.find(
      opt => opt.value === formData.medial_morphology
    );
    if (option) trail.push({ label: option.label, key: 'medial_morphology' });
  }

  // CT scan
  if (formData.has_ct_scan !== undefined) {
    const label = formData.has_ct_scan ? options.labels.yes : options.labels.no;
    trail.push({ label: `CT: ${label}`, key: 'has_ct_scan' });
  }

  // Posterior fracture type
  if (formData.posterior_fracture_type) {
    const option = options.posterior_fracture_types?.find(
      (opt: { value: string; label: string }) => opt.value === formData.posterior_fracture_type
    );
    if (option) trail.push({ label: option.label, key: 'posterior_fracture_type' });
  }

  // Fibula infrasindesmal transverse
  if (formData.fibula_infrasindesmal_transverse !== undefined) {
    const label = formData.fibula_infrasindesmal_transverse ? options.labels.yes : options.labels.no;
    trail.push({ label: label, key: 'fibula_infrasindesmal_transverse' });
  }

  // Fibula trace pattern
  if (formData.fibula_trace_pattern) {
    const option = options.fibula_trace_patterns?.find(
      opt => opt.value === formData.fibula_trace_pattern
    );
    if (option) trail.push({ label: option.label, key: 'fibula_trace_pattern' });
  }

  // Fibular level for transverse
  if (formData.fibular_level_for_transverse) {
    const option = options.fibular_level_for_transverse?.find(
      opt => opt.value === formData.fibular_level_for_transverse
    );
    if (option) trail.push({ label: option.label, key: 'fibular_level_for_transverse' });
  }

  return trail;
}

/**
 * Renders a breadcrumb trail of answered form questions as badges separated by chevrons.
 */
export function BreadcrumbTrail({ formData, options }: BreadcrumbTrailProps) {
  const trail = getBreadcrumbTrail(formData, options);

  if (trail.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {trail.map((item, index) => (
        <div key={item.key} className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {item.label}
          </Badge>
          {index < trail.length - 1 && (
            <span className="text-muted-foreground text-sm">&rsaquo;</span>
          )}
        </div>
      ))}
    </div>
  );
}
