import { apiGet } from "@/lib/api";
export interface CmsPage { key: string; title?: string; type?: string; content?: any; seo?: { title?: string; description?: string; keywords?: string[] }; }
export interface Banner { _id: string; title?: string; subtitle?: string; image?: string; link?: string; placement?: string; order?: number; }

export const getCmsPage = (key: string) => apiGet<{ page: CmsPage }>(`/cms/${key}`, { revalidate: 300, tags: [`cms:${key}`] });
export const getBanners = (placement = "hero") => apiGet<{ banners: Banner[] }>(`/banners?placement=${placement}`, { revalidate: 120, tags: ["banners"] });
export const getBlogList = () => apiGet<{ posts: any[] }>(`/blog`, { revalidate: 120, tags: ["blog"] });
