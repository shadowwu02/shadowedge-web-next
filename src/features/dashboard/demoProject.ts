export const SHADOWEDGE_DEMO_PROJECT = {
  id: "shadowedge-demo-campaign",
  name: "ShadowEdge Demo Campaign",
  status: "READY",
  metadata: {
    DEMO_PROJECT: true,
    analyticsExcluded: true,
    readOnly: true,
  },
  canvas: {
    nodes: [
      { id: "goal", type: "GOAL", label: "Launch a cinematic brand campaign" },
      { id: "strategy", type: "STRATEGY", label: "Premium product storytelling" },
      { id: "storyboard", type: "STORYBOARD", label: "Three-scene storyboard" },
      { id: "delivery", type: "DELIVERY", label: "Client review package v1.0" },
    ],
    edges: [
      { source: "goal", target: "strategy" },
      { source: "strategy", target: "storyboard" },
      { source: "storyboard", target: "delivery" },
    ],
  },
  storyboard: [
    { id: "shot-01", camera: "WIDE_SHOT", duration: 4, title: "Brand reveal" },
    { id: "shot-02", camera: "CLOSE_UP", duration: 3, title: "Product detail" },
    { id: "shot-03", camera: "TRACKING_SHOT", duration: 5, title: "Closing movement" },
  ],
  timeline: [
    { id: "clip-01", start: 0, duration: 4, type: "VIDEO_CLIP" },
    { id: "clip-02", start: 4, duration: 3, type: "IMAGE_CLIP" },
    { id: "clip-03", start: 7, duration: 5, type: "VIDEO_CLIP" },
  ],
  review: {
    status: "APPROVED",
    qualityScore: 92,
    summary: "Style, character, and delivery checks passed in this example.",
  },
  delivery: {
    packageId: "demo-delivery-v1",
    status: "READY",
    version: "v1.0",
  },
} as const;
