import { useCallback, useMemo, useState } from "react";
import type { RegionId } from "../types/domain";

interface UseMapSelectionParams {
  selectedIds?: RegionId[];
  onSelectionChange?: (selectedIds: RegionId[]) => void;
}

interface UseMapSelectionResult {
  selectedIdSet: Set<RegionId>;
  toggleSelection: (featureId: RegionId) => void;
  setSingleSelection: (featureId: RegionId) => void;
}

export function useMapSelection({
  selectedIds,
  onSelectionChange,
}: UseMapSelectionParams): UseMapSelectionResult {
  const [internalSelectedIds, setInternalSelectedIds] = useState<RegionId[]>(
    [],
  );

  const activeSelectedIds = selectedIds ?? internalSelectedIds;
  const selectedIdSet = useMemo(
    () => new Set(activeSelectedIds),
    [activeSelectedIds],
  );

  const toggleSelection = useCallback(
    (featureId: RegionId) => {
      if (selectedIds) {
        const isSelected = selectedIdSet.has(featureId);
        const next = isSelected
          ? activeSelectedIds.filter((id) => id !== featureId)
          : [...activeSelectedIds, featureId];
        onSelectionChange?.(next);
        return;
      }

      setInternalSelectedIds((previous) => {
        const exists = previous.includes(featureId);
        const next = exists
          ? previous.filter((id) => id !== featureId)
          : [...previous, featureId];
        onSelectionChange?.(next);
        return next;
      });
    },
    [activeSelectedIds, onSelectionChange, selectedIdSet, selectedIds],
  );

  const setSingleSelection = useCallback(
    (featureId: RegionId) => {
      if (selectedIds) {
        const next = selectedIdSet.has(featureId) ? [] : [featureId];
        onSelectionChange?.(next);
        return;
      }

      setInternalSelectedIds((previous) => {
        const next: RegionId[] = previous.includes(featureId)
          ? []
          : [featureId];
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange, selectedIdSet, selectedIds],
  );

  return {
    selectedIdSet,
    toggleSelection,
    setSingleSelection,
  };
}
