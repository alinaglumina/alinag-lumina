// Fallback data so the UI renders before the API/DB is wired.
import type { Product } from "@/services/product.service";
export const SAMPLE: Product[] = [
  { _id: "1", name: "Tiered Midi Dress · Blush", slug: "tiered-midi-dress", price: 1199, mrp: 3999, glyph: "👗", ratings: { average: 4.5, count: 210 }, sku: "LUM-DR-001", stock: 12 },
  { _id: "2", name: "Cloud-Runner Sneakers", slug: "cloud-runner-sneakers", price: 2499, mrp: 5999, glyph: "👟", ratings: { average: 4.6, count: 98 }, sku: "LUM-SN-002", stock: 30 },
  { _id: "3", name: "Banarasi Silk Saree", slug: "banarasi-silk-saree", price: 2899, mrp: 8499, glyph: "🥻", ratings: { average: 4.8, count: 156 }, sku: "LUM-SA-003", stock: 8 },
  { _id: "4", name: "Weekender Backpack 28L", slug: "weekender-backpack", price: 1349, mrp: 2999, glyph: "🎒", ratings: { average: 4.3, count: 64 }, sku: "LUM-BP-004", stock: 22 },
  { _id: "5", name: "Cotton A-line Kurti", slug: "cotton-aline-kurti", price: 649, mrp: 1799, glyph: "👚", ratings: { average: 4.4, count: 320 }, sku: "LUM-KU-005", stock: 40 },
  { _id: "6", name: "Minimalist Mesh Watch", slug: "minimalist-mesh-watch", price: 1799, mrp: 4499, glyph: "⌚", ratings: { average: 4.2, count: 45 }, sku: "LUM-WA-006", stock: 15 },
  { _id: "7", name: "Structured Baseball Cap", slug: "baseball-cap", price: 499, mrp: 1199, glyph: "🧢", ratings: { average: 4.1, count: 77 }, sku: "LUM-CP-007", stock: 60 },
  { _id: "8", name: "Polarized Aviators", slug: "polarized-aviators", price: 899, mrp: 2499, glyph: "🕶️", ratings: { average: 4.5, count: 132 }, sku: "LUM-SG-008", stock: 25 },
];
export const findSample = (slug: string) => SAMPLE.find((p) => p.slug === slug);
