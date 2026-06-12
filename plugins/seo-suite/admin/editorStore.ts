export type SeoEditorDraft = {
  title: string;
  description: string;
  focus_keyword: string;
  canonical: string;
  robots: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image_url: string;
  twitter_card: string;
  schema_type: string;
  breadcrumb_title: string;
  sitemap_exclude: boolean;
};

export const emptySeoDraft: SeoEditorDraft = {
  title: '', description: '', focus_keyword: '', canonical: '', robots: '', og_title: '', og_description: '', og_image_url: '',
  twitter_title: '', twitter_description: '', twitter_image_url: '', twitter_card: 'summary_large_image', schema_type: 'Article', breadcrumb_title: '', sitemap_exclude: false,
};

let draft: SeoEditorDraft = { ...emptySeoDraft };
let loadedUuid: string | null = null;

export function setSeoEditorDraft(value: SeoEditorDraft, uuid?: string | null) { draft = value; if (uuid !== undefined) loadedUuid = uuid; }
export function patchSeoEditorDraft(value: Partial<SeoEditorDraft>) { draft = { ...draft, ...value }; }
export function getSeoEditorDraft() { return draft; }
export function getLoadedSeoUuid() { return loadedUuid; }
