import type { ContentBuildCoordinatorDependencies } from "./content_build_coordinator_context.js";
import type { ContentBuildPlan } from "./content_build_plan.js";
import { ContentCoordinatorDelegatesB } from "./content_coordinator_delegates_b.js";

export class ContentBuildCoordinator extends ContentCoordinatorDelegatesB {
  plan: Promise<ContentBuildPlan> | null = null;
  dependencies!: ContentBuildCoordinatorDependencies;

  constructor(dependencies: ContentBuildCoordinatorDependencies) {
    super();
    this.dependencies = dependencies;
  }
}
