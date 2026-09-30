import type {
  ContentLink,
  ContentManifest,
  ContentManifestEntry,
} from "@riebeckite/core";
import { collectDefinedRelations, isNoteHidden } from "./ontology.js";
import { resolveExcaliBrainOptions } from "./options.js";
import type {
  ExcaliBrainBuildInput,
  ExcaliBrainGraph,
  ExcaliBrainLink,
  ExcaliBrainNode,
  ExcaliBrainNodeRole,
  ExcaliBrainRelationType,
  ExcaliBrainRole,
} from "./types.js";

type Relation = {
  node: ExcaliBrainNode;
  role: ExcaliBrainNodeRole;
  relationType: ExcaliBrainRelationType;
};

/**
 * Build the ExcaliBrain graph for a single note. Explicit (ontology) relations
 * always win over inferred ones; link inference derives parents from backlinks,
 * children from outgoing links, and left friends from mutual links.
 */
export function buildExcaliBrainGraph(
  input: ExcaliBrainBuildInput,
): ExcaliBrainGraph {
  const options = resolveExcaliBrainOptions(input.options);
  const { slug, manifest } = input;
  const centerEntry = manifest.bySlug.get(slug) ?? null;
  const center: ExcaliBrainNode = {
    id: slug,
    slug,
    title: resolveTitle(centerEntry, input.frontmatter, slug),
    permalink: centerEntry?.permalink ?? null,
    virtual: false,
    role: "center",
    relationType: "defined",
  };

  if (
    !options.showHidden &&
    isNoteHidden({
      frontmatter: input.frontmatter,
      markdown: input.markdown,
      ontology: options.ontology,
    })
  ) {
    return { center, nodes: [], links: [] };
  }

  const relations = new Map<string, Relation>();

  const add = (
    target: string,
    role: ExcaliBrainNodeRole,
    relationType: ExcaliBrainRelationType,
  ) => {
    if (role === "center") return;
    const node = resolveNode(target, slug, manifest);
    if (!node) return;

    const existing = relations.get(node.id);
    if (existing) {
      if (existing.relationType === "inferred" && relationType === "defined") {
        existing.role = role;
        existing.relationType = "defined";
        existing.node.role = role;
        existing.node.relationType = "defined";
      }
      return;
    }

    node.role = role;
    node.relationType = relationType;
    relations.set(node.id, { node, role, relationType });
  };

  // 1. Explicit relations from frontmatter and dataview inline fields.
  for (const relation of collectDefinedRelations({
    frontmatter: input.frontmatter,
    markdown: input.markdown,
    ontology: options.ontology,
  })) {
    add(relation.target, relation.role, "defined");
  }

  // 2. Inferred relations from the content graph.
  const outgoing = noteLinkSlugs(manifest.outgoingLinks.get(slug) ?? [], slug);
  const incoming = unique(
    (manifest.incomingLinks.get(slug) ?? []).filter(
      (candidate) => candidate !== slug,
    ),
  );
  const outgoingSet = new Set(outgoing);
  const mutual = incoming.filter((candidate) => outgoingSet.has(candidate));
  const mutualSet = new Set(mutual);

  if (options.infer) {
    for (const target of outgoing) {
      if (!mutualSet.has(target)) add(target, "child", "inferred");
    }
    for (const target of incoming) {
      if (!mutualSet.has(target)) add(target, "parent", "inferred");
    }
    for (const target of mutual) add(target, "leftFriend", "inferred");
  }

  // 3. Siblings: other children of this note's parents.
  if (options.infer && options.siblings) {
    const parents = [...relations.values()].filter(
      (relation) => relation.role === "parent",
    );
    for (const parent of parents) {
      const parentSlug = parent.node.slug;
      if (!parentSlug) continue;
      const siblings = noteLinkSlugs(
        manifest.outgoingLinks.get(parentSlug) ?? [],
        slug,
      );
      for (const siblingSlug of siblings) {
        add(siblingSlug, "sibling", "inferred");
      }
    }
  }

  const nodes = [...relations.values()].map((relation) => relation.node);
  const links: ExcaliBrainLink[] = [...relations.values()].map((relation) => ({
    from: slug,
    to: relation.node.id,
    role: relation.role as ExcaliBrainRole,
    relationType: relation.relationType,
  }));

  return { center, nodes, links };
}

function resolveNode(
  target: string,
  selfSlug: string,
  manifest: ContentManifest,
): ExcaliBrainNode | null {
  const raw = target.trim();
  if (!raw) return null;

  const targetSlug = resolveSlug(raw, manifest);
  if (targetSlug && targetSlug !== selfSlug) {
    const entry = manifest.bySlug.get(targetSlug);
    if (entry) {
      return {
        id: targetSlug,
        slug: targetSlug,
        title: entry.title,
        permalink: entry.permalink,
        virtual: false,
        role: "parent",
        relationType: "defined",
      };
    }
  }

  return {
    id: `virtual:${raw.toLowerCase()}`,
    slug: null,
    title: raw,
    permalink: null,
    virtual: true,
    role: "parent",
    relationType: "defined",
  };
}

function resolveSlug(target: string, manifest: ContentManifest): string | null {
  const direct = manifest.bySlug.get(target);
  if (direct) return direct.slug;

  const indexed = manifest.contentIndex.get(target.toLowerCase());
  if (indexed) return indexed;

  const permalink = manifest.byPermalink.get(target);
  if (permalink) return permalink.slug;

  return null;
}

function noteLinkSlugs(
  links: readonly ContentLink[],
  selfSlug: string,
): string[] {
  return unique(
    links
      .filter(
        (link): link is ContentLink & { slug: string } =>
          link.kind === "note" && link.slug !== null && link.slug !== selfSlug,
      )
      .map((link) => link.slug),
  );
}

function resolveTitle(
  entry: ContentManifestEntry | null,
  frontmatter: Record<string, unknown>,
  slug: string,
): string {
  if (entry?.title) return entry.title;
  const title = frontmatter.title;
  return typeof title === "string" && title.trim() ? title : slug;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
