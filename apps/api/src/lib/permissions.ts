// Role → permission catalog. "*" = all; "products.*" = all product actions.
export const PERMISSIONS: Record<string, string[]> = {
  superadmin: ["*"],
  admin: [
    "products.*", "orders.*", "categories.*", "brands.*", "coupons.*", "reviews.*",
    "cms.*", "banners.*", "blogs.*", "reports.read", "customers.*", "inventory.*",
    "settings.*", "audit.read", "roles.read",
  ],
  vendor: ["products.read", "products.create", "products.update", "inventory.*", "orders.read", "reports.read"],
  staff: ["products.read", "orders.read", "orders.update", "reviews.moderate", "inventory.read", "reports.read"],
  customer: [],
};

// Does a role grant a permission like "orders.update"?
export function can(role: string, permission: string): boolean {
  const grants = PERMISSIONS[role] ?? [];
  if (grants.includes("*")) return true;
  if (grants.includes(permission)) return true;
  const [domain] = permission.split(".");
  return grants.includes(`${domain}.*`);
}

export const ROLES = Object.keys(PERMISSIONS);
