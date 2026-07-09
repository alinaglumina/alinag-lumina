export const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

// Ensure uniqueness against a model by appending -2, -3, … if needed.
export async function uniqueSlug(model: any, base: string, excludeId?: string) {
  let slug = slugify(base) || "item";
  let n = 1;
  while (await model.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) })) { n += 1; slug = `${slugify(base)}-${n}`; }
  return slug;
}
