// Server component: renders the facet rail. Wire inputs to query params in a client wrapper as needed.
export default function Filters() {
  const brands = ["Aurélie", "Stride", "Voyager", "Halo", "Terra"];
  const colors = ["Black", "Blue", "Rose", "Green", "Gold"];
  const sizes = ["XS", "S", "M", "L", "XL"];
  return (
    <aside className="filters">
      <h4>Price</h4>
      <label><input type="checkbox" /> Under ₹500</label>
      <label><input type="checkbox" /> ₹500–₹1,500</label>
      <label><input type="checkbox" /> ₹1,500–₹5,000</label>
      <h4>Brand</h4>
      {brands.map((b) => <label key={b}><input type="checkbox" /> {b}</label>)}
      <h4>Rating</h4>
      {[4, 3, 2].map((r) => <label key={r}><input type="checkbox" /> {r}★ & above</label>)}
      <h4>Color</h4>
      {colors.map((c) => <label key={c}><input type="checkbox" /> {c}</label>)}
      <h4>Size</h4>
      {sizes.map((s) => <label key={s}><input type="checkbox" /> {s}</label>)}
      <h4>Availability</h4>
      <label><input type="checkbox" /> In stock</label>
      <h4>Offers</h4>
      <label><input type="checkbox" /> Discounted</label>
      <label><input type="checkbox" /> New arrivals</label>
    </aside>
  );
}
