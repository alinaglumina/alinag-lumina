import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCmsPage } from "@/services/content.service";
import { CMS_FALLBACK } from "@/lib/cms-fallback";

async function load(slug: string) {
  try { const r = await getCmsPage(slug); if (r.page) return { title: r.page.title ?? slug, html: r.page.content?.html ?? r.page.content?.body ?? "", seo: r.page.seo }; } catch {}
  const fb = CMS_FALLBACK[slug];
  return fb ? { title: fb.title, html: fb.html, seo: undefined } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return { title: "Not found" };
  return { title: page.seo?.title ?? page.title, description: page.seo?.description };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) notFound();
  return (
    <div className="wrap" style={{ margin: "36px auto", maxWidth: 820 }}>
      <h1 className="sec-title" style={{ fontSize: 30 }}>{page.title}</h1>
      <article style={{ marginTop: 16, color: "var(--ink-soft)", lineHeight: 1.75 }}
        dangerouslySetInnerHTML={{ __html: page.html || "<p>Content coming soon.</p>" }} />
    </div>
  );
}
