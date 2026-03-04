import { geoMercator, geoPath } from "d3-geo";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { MapLayer } from "./MapLayer";
import { getMapAriaLabel } from "./nepalMapLevels";
import { mergeTheme } from "./nepalMapTheme";
import { buildLayerCollections, getNextNavigableLevel } from "../topology";
import { VIEW_LEVEL } from "../constants/viewLevels";
import { resolveZoomCompensatedFontSize } from "./viewBox";
import {
  getClippingFeatureForLevel,
  resolveActiveFeatures,
  resolveRootFeature,
} from "../topologyScope";
import { createMapPolicyResolver } from "../policy/mapPolicy";
import {
  buildDisabledLocalUnitIdSet,
  buildWardAvailabilityByLocalUnit,
  createFeatureDisabledResolver,
} from "../policy/featureState";
import { getNepalTopology } from "../data/nepalTopology";
import {
  buildInitialInteractionState,
  buildInteractionConfig,
  canDrillFromState,
  evaluateBackgroundNavigation,
  evaluateRegionActivation,
  type InteractionState,
} from "../interaction/transitionEngine";
import {
  useAnimatedViewBox,
  useContainerSize,
  useLayerFade,
  useMapSelection,
  useStableRegionHover,
} from "../hooks/index";
import type {
  NavigationNode,
  NepalMapProps,
  RegionFeature,
  RegionFeatureCollection,
  ViewLevel,
} from "../types";

export function NepalMap({
  startLevel,
  startRegion,
  startRegionId,
  endLevel = VIEW_LEVEL.WARD,
  skipLevels,
  showFirstLayerDivisions = false,
  openEndLevel = false,
  showPartitionLabels = false,
  partitionLabelFontSize = 10,
  selectableProtectedAreas = false,
  selectable = true,
  selectionMode = "single",
  mapPolicy,
  selectedIds,
  fitParent = false,
  width,
  height,
  theme,
  onRegionHover,
  onRegionClick,
  onSelectionChange,
  ariaLabel = "Nepal administrative map",
}: NepalMapProps) {
  const fallbackWidth = width ?? 960;
  const fallbackHeight = height ?? 640;

  const effectiveStartLevel = startLevel ?? VIEW_LEVEL.COUNTRY;
  const requestedStartRegionId = startRegion?.id ?? startRegionId;
  const interactionConfig = useMemo(
    () =>
      buildInteractionConfig({
        startLevel: effectiveStartLevel,
        endLevel,
        skipLevels,
        selectionMode,
        selectable,
        showFirstLayerDivisions,
        openEndLevel,
      }),
    [
      effectiveStartLevel,
      endLevel,
      openEndLevel,
      selectable,
      selectionMode,
      showFirstLayerDivisions,
      skipLevels,
    ],
  );

  const exitClipId = `${useId().replace(/[:]/g, "")}-exit`;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mergedTheme = useMemo(() => mergeTheme(theme), [theme]);
  const policyResolver = useMemo(
    () => createMapPolicyResolver(mergedTheme, mapPolicy),
    [mapPolicy, mergedTheme],
  );

  const { selectedIdSet, toggleSelection, setSingleSelection } =
    useMapSelection({
      selectedIds,
      onSelectionChange,
    });

  const { width: viewportWidth, height: viewportHeight } = useContainerSize({
    fitParent,
    fallbackWidth,
    fallbackHeight,
    containerRef,
  });

  const collections = useMemo(
    () => buildLayerCollections(getNepalTopology()),
    [],
  );

  const rootFeature = useMemo(() => {
    if (startRegion && startRegion.level !== interactionConfig.startLevel) {
      throw new Error(
        `[NepalMap] startRegion level '${startRegion.level}' does not match startLevel '${interactionConfig.startLevel}'.`,
      );
    }

    return resolveRootFeature(
      collections,
      interactionConfig.startLevel,
      requestedStartRegionId,
    );
  }, [
    collections,
    interactionConfig.startLevel,
    requestedStartRegionId,
    startRegion,
  ]);
  const rootRegionId = rootFeature?.properties.__id ?? null;

  const initialInteractionState = useMemo(
    () =>
      buildInitialInteractionState({
        config: interactionConfig,
        rootFeature,
      }),
    [interactionConfig, rootFeature],
  );

  const initialStateResetKey = useMemo(
    () =>
      [
        interactionConfig.startLevel,
        interactionConfig.endLevel,
        interactionConfig.selectionBehavior,
        interactionConfig.selectable ? "1" : "0",
        [...interactionConfig.skipLevels].sort().join(","),
        rootRegionId ?? "",
        showFirstLayerDivisions ? "1" : "0",
        interactionConfig.openEndLevel ? "1" : "0",
      ].join("::"),
    [
      interactionConfig.endLevel,
      interactionConfig.openEndLevel,
      interactionConfig.selectable,
      interactionConfig.selectionBehavior,
      interactionConfig.skipLevels,
      interactionConfig.startLevel,
      rootRegionId,
      showFirstLayerDivisions,
    ],
  );

  const [viewLevel, setViewLevel] = useState<ViewLevel>(
    initialInteractionState.viewLevel,
  );
  const [navigationStack, setNavigationStack] = useState<NavigationNode[]>(
    initialInteractionState.navigationStack,
  );

  useEffect(() => {
    setViewLevel(initialInteractionState.viewLevel);
    setNavigationStack(initialInteractionState.navigationStack);
  }, [initialStateResetKey]);

  const { hoveredId, handleHover } = useStableRegionHover({ onRegionHover });

  const activeFeatures = useMemo(() => {
    return resolveActiveFeatures({
      collections,
      viewLevel,
      navigationStack,
      startLevel: interactionConfig.startLevel,
      rootRegionId,
    });
  }, [
    collections,
    interactionConfig.startLevel,
    navigationStack,
    rootRegionId,
    viewLevel,
  ]);

  const activeCollection = useMemo<RegionFeatureCollection>(() => {
    if (activeFeatures.length > 0) {
      return { type: "FeatureCollection", features: activeFeatures };
    }
    return collections.country;
  }, [activeFeatures, collections.country]);

  const projection = useMemo(() => {
    const next = geoMercator();
    next.fitSize([viewportWidth, viewportHeight], collections.country);
    return next;
  }, [collections.country, viewportHeight, viewportWidth]);

  const path = useMemo(() => geoPath(projection), [projection]);

  const viewBox = useAnimatedViewBox({
    path,
    activeCollection,
    viewportWidth,
    viewportHeight,
  });

  const effectivePartitionLabelFontSize = useMemo(
    () =>
      resolveZoomCompensatedFontSize(
        partitionLabelFontSize,
        viewBox,
        viewportWidth,
        viewportHeight,
      ),
    [partitionLabelFontSize, viewBox, viewportHeight, viewportWidth],
  );

  const clippingFeature = useMemo(
    () => getClippingFeatureForLevel(viewLevel, navigationStack),
    [navigationStack, viewLevel],
  );

  const clippingPathData = useMemo(() => {
    if (!clippingFeature) return null;
    return path(clippingFeature);
  }, [clippingFeature, path]);

  const interactionState: InteractionState = useMemo(
    () => ({ viewLevel, navigationStack }),
    [navigationStack, viewLevel],
  );

  const canDrill = useMemo(
    () => canDrillFromState(interactionState, interactionConfig),
    [interactionConfig, interactionState],
  );

  const hasWardLevelBelowLocalUnit = useMemo(
    () =>
      getNextNavigableLevel(
        VIEW_LEVEL.LOCAL_UNIT,
        interactionConfig.endLevel,
        interactionConfig.skipLevels,
      ) != null,
    [interactionConfig.endLevel, interactionConfig.skipLevels],
  );

  const wardAvailabilityByLocalUnit = useMemo(() => {
    return buildWardAvailabilityByLocalUnit({
      wardFeatures: collections.wards.features,
      navigationStack,
      selectableProtectedAreas,
      policyResolver,
    });
  }, [
    collections.wards.features,
    navigationStack,
    policyResolver,
    selectableProtectedAreas,
  ]);

  const disabledLocalUnitIdSet = useMemo(() => {
    return buildDisabledLocalUnitIdSet({
      viewLevel,
      hasWardLevelBelowLocalUnit,
      localUnitFeatures: collections.local_units.features,
      navigationStack,
      wardAvailabilityByLocalUnit,
    });
  }, [
    collections.local_units.features,
    hasWardLevelBelowLocalUnit,
    navigationStack,
    viewLevel,
    wardAvailabilityByLocalUnit,
  ]);

  const { exitingLayer, snapshotAndFadeCurrentLayer } = useLayerFade();

  const isDisabled = useMemo(
    () =>
      createFeatureDisabledResolver({
        viewLevel,
        selectableProtectedAreas,
        disabledLocalUnitIdSet,
        policyResolver,
      }),
    [
      disabledLocalUnitIdSet,
      policyResolver,
      selectableProtectedAreas,
      viewLevel,
    ],
  );

  const fillForFeature = useCallback(
    (feature: RegionFeature): string => {
      const featureTheme = policyResolver.getThemeForFeature(
        feature,
        viewLevel,
      );

      if (isDisabled(feature)) return featureTheme.disabled;

      const featureId = feature.properties.__id;
      if (selectedIdSet.has(featureId)) return featureTheme.selected;
      if (hoveredId === featureId) return featureTheme.hover;
      return featureTheme.primary;
    },
    [hoveredId, isDisabled, policyResolver, selectedIdSet, viewLevel],
  );

  const strokeForFeature = useCallback(
    (feature: RegionFeature): string =>
      policyResolver.getThemeForFeature(feature, viewLevel).stroke,
    [policyResolver, viewLevel],
  );

  const strokeWidthForFeature = useCallback(
    (feature: RegionFeature): number =>
      policyResolver.getThemeForFeature(feature, viewLevel).strokeWidth,
    [policyResolver, viewLevel],
  );

  const isSelected = useCallback(
    (feature: RegionFeature): boolean =>
      selectedIdSet.has(feature.properties.__id),
    [selectedIdSet],
  );

  const applyNavigationState = useCallback(
    (nextState: InteractionState) => {
      snapshotAndFadeCurrentLayer(activeFeatures, clippingPathData);
      setNavigationStack(nextState.navigationStack);
      setViewLevel(nextState.viewLevel);
    },
    [activeFeatures, clippingPathData, snapshotAndFadeCurrentLayer],
  );

  const handleActivate = useCallback(
    (feature: RegionFeature) => {
      if (isDisabled(feature)) {
        return;
      }

      const outcome = evaluateRegionActivation(
        interactionState,
        feature,
        interactionConfig,
      );

      if (outcome.kind === "none") {
        return;
      }

      onRegionClick?.(feature);

      if (outcome.kind === "select") {
        if (outcome.selectionBehavior === "multi") {
          toggleSelection(outcome.selectedRegionId);
        } else {
          setSingleSelection(outcome.selectedRegionId);
        }
        return;
      }

      if (outcome.kind === "drill") {
        applyNavigationState(outcome.nextState);
      }
    },
    [
      applyNavigationState,
      interactionConfig,
      interactionState,
      onRegionClick,
      setSingleSelection,
      toggleSelection,
      isDisabled,
    ],
  );

  const levelTheme = useMemo(
    () => policyResolver.getThemeForLevel(viewLevel),
    [policyResolver, viewLevel],
  );

  const handleBackgroundClick = useCallback(() => {
    const outcome = evaluateBackgroundNavigation(
      interactionState,
      interactionConfig,
    );
    if (outcome.changed) {
      applyNavigationState(outcome.nextState);
    }
  }, [applyNavigationState, interactionConfig, interactionState]);

  const sharedLayerProps = {
    path,
    showPartitionLabels,
    partitionLabelFontSize: effectivePartitionLabelFontSize,
    partitionLabelColor: levelTheme.stroke,
    fillForFeature,
    strokeForFeature,
    strokeWidthForFeature,
    isSelected,
    isDisabled,
    canDrill,
    onHover: handleHover,
    onActivate: handleActivate,
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: fitParent ? "100%" : viewportWidth,
        height: fitParent ? "100%" : viewportHeight,
      }}
    >
      <svg
        width={fitParent ? "100%" : viewportWidth}
        height={fitParent ? "100%" : viewportHeight}
        viewBox={viewBox}
        role="region"
        aria-label={getMapAriaLabel(ariaLabel, viewLevel)}
        style={{ background: levelTheme.background, display: "block" }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          handleBackgroundClick();
        }}
      >
        {exitingLayer?.clipPathData ? (
          <defs>
            <clipPath id={exitClipId}>
              <path d={exitingLayer.clipPathData} />
            </clipPath>
          </defs>
        ) : null}

        {exitingLayer ? (
          <g
            clipPath={
              exitingLayer.clipPathData ? `url(#${exitClipId})` : undefined
            }
          >
            <MapLayer
              features={exitingLayer.features}
              opacity={exitingLayer.opacity}
              interactive={false}
              {...sharedLayerProps}
            />
          </g>
        ) : null}

        <g>
          <MapLayer
            features={activeFeatures}
            opacity={1}
            interactive
            {...sharedLayerProps}
          />
        </g>
      </svg>
    </div>
  );
}
