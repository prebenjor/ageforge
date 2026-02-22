import { memo } from "react";
import { RESOURCE_LABELS, RESOURCES } from "../game/content";
import type { Resources } from "../game/types";
import { formatNumber } from "../game/utils";

interface ResourceGridProps {
  resources: Resources;
}

export const ResourceGrid = memo(function ResourceGrid({ resources }: ResourceGridProps): JSX.Element {
  return (
    <div className="resource-grid">
      {RESOURCES.map((resource) => (
        <article key={resource} className="resource-card">
          <p className="muted">{RESOURCE_LABELS[resource]}</p>
          <p className="value">{formatNumber(resources[resource])}</p>
        </article>
      ))}
    </div>
  );
});
