import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export interface DashboardFilterState {
  sex?: string
  trauma_energy?: string
  laterality?: string
}

interface DashboardFiltersProps {
  filters: DashboardFilterState
  onChange: (filters: DashboardFilterState) => void
}

const SEX_OPTIONS = ['male', 'female'] as const
const ENERGY_OPTIONS = ['low', 'high'] as const
const LATERALITY_OPTIONS = ['left', 'right'] as const

function ToggleGroup({
  label,
  options,
  value,
  onSelect,
}: {
  label: string
  options: readonly string[]
  value: string | undefined
  onSelect: (val: string | undefined) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1.5" aria-label={label}>
      <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </legend>
      <div className="flex gap-1" role="group">
        {options.map((option) => (
          <Button
            key={option}
            variant={value === option ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(value === option ? undefined : option)}
            aria-pressed={value === option}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </Button>
        ))}
      </div>
    </fieldset>
  )
}

export function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-wrap items-end gap-4">
      <ToggleGroup
        label="Sex"
        options={SEX_OPTIONS}
        value={filters.sex}
        onSelect={(sex) => onChange({ ...filters, sex })}
      />
      <ToggleGroup
        label="Energy"
        options={ENERGY_OPTIONS}
        value={filters.trauma_energy}
        onSelect={(trauma_energy) => onChange({ ...filters, trauma_energy })}
      />
      <ToggleGroup
        label="Laterality"
        options={LATERALITY_OPTIONS}
        value={filters.laterality}
        onSelect={(laterality) => onChange({ ...filters, laterality })}
      />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
