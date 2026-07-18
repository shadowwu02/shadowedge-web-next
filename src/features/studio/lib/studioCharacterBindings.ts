type CharacterBindingNode = {
  id: string;
  data: {
    kind: string;
    characterRefs?: string[];
  };
};

type CharacterBindingEdge = {
  source: string;
  target: string;
};

const CHARACTER_TARGET_KINDS = new Set([
  "videoGenerate",
  "motionControl",
  "remakeShot",
]);

function sameIds(left: string[] = [], right: string[] = []) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

/**
 * Derives character bindings from Canvas edges. The binding is metadata only:
 * it never invokes a provider or changes a generation payload.
 */
export function applyCharacterBindings<
  TNode extends CharacterBindingNode,
  TEdge extends CharacterBindingEdge,
>(nodes: TNode[], edges: TEdge[]): TNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const characterIds = new Set(
    nodes.filter((node) => node.data.kind === "character").map((node) => node.id),
  );
  const directByTarget = new Map<string, string[]>();

  for (const edge of edges) {
    if (!characterIds.has(edge.source)) continue;
    const target = nodeById.get(edge.target);
    if (!target || !CHARACTER_TARGET_KINDS.has(target.data.kind)) continue;
    directByTarget.set(
      edge.target,
      uniqueIds([...(directByTarget.get(edge.target) || []), edge.source]),
    );
  }

  // A Character -> Shot -> Video chain carries the same character references
  // into the generated video node without changing the Video API contract.
  const inheritedByVideo = new Map<string, string[]>();
  for (const edge of edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (source?.data.kind !== "remakeShot" || target?.data.kind !== "videoGenerate") {
      continue;
    }
    inheritedByVideo.set(
      target.id,
      uniqueIds([
        ...(inheritedByVideo.get(target.id) || []),
        ...(directByTarget.get(source.id) || source.data.characterRefs || []),
      ]),
    );
  }

  let changed = false;
  const nextNodes = nodes.map((node) => {
    if (!CHARACTER_TARGET_KINDS.has(node.data.kind)) return node;
    const nextRefs = uniqueIds([
      ...(directByTarget.get(node.id) || []),
      ...(node.data.kind === "videoGenerate"
        ? inheritedByVideo.get(node.id) || []
        : []),
    ]);
    if (sameIds(node.data.characterRefs, nextRefs)) return node;
    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        characterRefs: nextRefs,
      },
    };
  });

  return changed ? nextNodes : nodes;
}
