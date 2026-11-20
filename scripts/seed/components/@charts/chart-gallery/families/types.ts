export type GalleryEntry = { key: string; title: string; render: () => any };
export type GalleryFamily = { key: string; label: string; blocks: GalleryEntry[] };
