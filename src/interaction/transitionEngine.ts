import {
  getNextNavigableLevel,
  getPreviousNavigableLevel,
  levelOrder,
} from "../topology";
import { VIEW_LEVEL } from "../constants/viewLevels";
import type { RegionId } from "../types/domain";
import type {
  NavigationNode,
  RegionFeature,
  SelectionMode,
  ViewLevel,
} from "../types";

export interface InteractionState {
  viewLevel: ViewLevel;
  navigationStack: NavigationNode[];
}

export interface InteractionConfig {
  startLevel: ViewLevel;
  endLevel: ViewLevel;
  skipLevels: ReadonlySet<ViewLevel>;
  selectionBehavior: SelectionMode;
  selectable: boolean;
  showFirstLayerDivisions: boolean;
  openEndLevel: boolean;
}

export interface BuildInteractionConfigInput {
  startLevel: ViewLevel;
  endLevel: ViewLevel;
  skipLevels?: ViewLevel[];
  selectionMode: SelectionMode;
  selectable: boolean;
  showFirstLayerDivisions?: boolean;
  openEndLevel?: boolean;
}

export interface BuildInitialInteractionStateInput {
  config: InteractionConfig;
  rootFeature: RegionFeature | null;
}

export type RegionActivateOutcome =
  | {
      kind: "none";
      nextState: InteractionState;
    }
  | {
      kind: "select";
      nextState: InteractionState;
      selectedRegionId: RegionId;
      selectionBehavior: Exclude<SelectionMode, "none">;
    }
  | {
      kind: "drill";
      nextState: InteractionState;
      targetLevel: ViewLevel;
    };

export interface BackgroundNavigateOutcome {
  nextState: InteractionState;
  changed: boolean;
}

export function buildInteractionConfig(
  input: BuildInteractionConfigInput,
): InteractionConfig {
  const startIndex = levelOrder.indexOf(input.startLevel);
  const endIndex = levelOrder.indexOf(input.endLevel);

  const endLevel =
    startIndex >= 0 && endIndex >= startIndex
      ? input.endLevel
      : input.startLevel;

  const sanitizedSkipLevels = new Set<ViewLevel>(input.skipLevels ?? []);
  sanitizedSkipLevels.delete(VIEW_LEVEL.COUNTRY);
  sanitizedSkipLevels.delete(input.startLevel);
  sanitizedSkipLevels.delete(endLevel);

  return {
    startLevel: input.startLevel,
    endLevel,
    skipLevels: sanitizedSkipLevels,
    selectionBehavior: input.selectionMode,
    selectable: input.selectable,
    showFirstLayerDivisions: input.showFirstLayerDivisions ?? false,
    openEndLevel: input.openEndLevel ?? false,
  };
}

function getFocusedNode(
  stack: NavigationNode[],
  level: Exclude<ViewLevel, "country">,
): NavigationNode | null {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const node = stack[index];
    if (node.level === level) {
      return node;
    }
  }

  return null;
}

function canOpenEndLevelFromState(
  state: InteractionState,
  config: InteractionConfig,
): boolean {
  if (!config.openEndLevel) {
    return false;
  }

  if (state.viewLevel !== config.endLevel) {
    return false;
  }

  const navigationLevel = toNavigationLevel(state.viewLevel);
  if (!navigationLevel) {
    return false;
  }

  return getFocusedNode(state.navigationStack, navigationLevel) == null;
}

function getMinimumVisibleLevel(config: InteractionConfig): ViewLevel {
  if (!config.showFirstLayerDivisions) {
    return config.startLevel;
  }

  return (
    getNextNavigableLevel(
      config.startLevel,
      config.endLevel,
      config.skipLevels,
    ) ?? config.startLevel
  );
}

function toNavigationLevel(
  level: ViewLevel,
): Exclude<ViewLevel, "country"> | null {
  if (level === VIEW_LEVEL.COUNTRY) return null;
  return level;
}

export function canDrillFromState(
  state: InteractionState,
  config: InteractionConfig,
): boolean {
  return (
    getNextNavigableLevel(
      state.viewLevel,
      config.endLevel,
      config.skipLevels,
    ) != null || canOpenEndLevelFromState(state, config)
  );
}

export function buildInitialInteractionState(
  input: BuildInitialInteractionStateInput,
): InteractionState {
  const { config, rootFeature } = input;

  if (!config.showFirstLayerDivisions) {
    return { viewLevel: config.startLevel, navigationStack: [] };
  }

  const nextLevel = getNextNavigableLevel(
    config.startLevel,
    config.endLevel,
    config.skipLevels,
  );

  if (!nextLevel) {
    return { viewLevel: config.startLevel, navigationStack: [] };
  }

  const startNodeLevel = toNavigationLevel(config.startLevel);
  if (startNodeLevel && rootFeature) {
    return {
      viewLevel: nextLevel,
      navigationStack: [{ level: startNodeLevel, feature: rootFeature }],
    };
  }

  return {
    viewLevel: nextLevel,
    navigationStack: [],
  };
}

export function evaluateRegionActivation(
  state: InteractionState,
  feature: RegionFeature,
  config: InteractionConfig,
): RegionActivateOutcome {
  const nextLevel = getNextNavigableLevel(
    state.viewLevel,
    config.endLevel,
    config.skipLevels,
  );

  if (!nextLevel) {
    if (canOpenEndLevelFromState(state, config)) {
      const stackLevel = toNavigationLevel(state.viewLevel);
      const nextStack = stackLevel
        ? [...state.navigationStack, { level: stackLevel, feature }]
        : state.navigationStack;

      return {
        kind: "drill",
        nextState: { viewLevel: state.viewLevel, navigationStack: nextStack },
        targetLevel: state.viewLevel,
      };
    }

    if (!config.selectable || config.selectionBehavior === "none") {
      return { kind: "none", nextState: state };
    }

    return {
      kind: "select",
      nextState: state,
      selectedRegionId: feature.properties.__id,
      selectionBehavior: config.selectionBehavior,
    };
  }

  const stackLevel = toNavigationLevel(state.viewLevel);
  const nextStack = stackLevel
    ? [...state.navigationStack, { level: stackLevel, feature }]
    : state.navigationStack;

  return {
    kind: "drill",
    nextState: { viewLevel: nextLevel, navigationStack: nextStack },
    targetLevel: nextLevel,
  };
}

export function evaluateBackgroundNavigation(
  state: InteractionState,
  config: InteractionConfig,
): BackgroundNavigateOutcome {
  const minimumVisibleLevel = getMinimumVisibleLevel(config);
  const minimumLevelIndex = levelOrder.indexOf(minimumVisibleLevel);

  if (state.navigationStack.length > 0) {
    const parent = state.navigationStack[state.navigationStack.length - 1];
    const parentIndex = levelOrder.indexOf(parent.level);
    if (parentIndex < minimumLevelIndex) {
      return { changed: false, nextState: state };
    }

    return {
      changed: true,
      nextState: {
        viewLevel: parent.level,
        navigationStack: state.navigationStack.slice(0, -1),
      },
    };
  }

  const previousLevel = getPreviousNavigableLevel(
    state.viewLevel,
    config.startLevel,
    config.skipLevels,
  );

  if (!previousLevel) {
    return { changed: false, nextState: state };
  }

  if (levelOrder.indexOf(previousLevel) < minimumLevelIndex) {
    return { changed: false, nextState: state };
  }

  return {
    changed: true,
    nextState: {
      ...state,
      viewLevel: previousLevel,
    },
  };
}
