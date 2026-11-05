export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  const items = new Map();
  for (const row of value) {
    if (typeof row?.product_id !== 'string' || !Number.isInteger(row.quantity) || row.quantity < 1) continue;
    items.set(row.product_id, { product_id: row.product_id, quantity: Math.min(10, (items.get(row.product_id)?.quantity || 0) + row.quantity) });
  }
  return [...items.values()].slice(0, 30);
}
export function cartLines(cart, products) {
  return cart.map(item => ({ ...item, product: products.find(p => p.id === item.product_id) })).filter(item => item.product);
}
export function reconcileCart(cart,products,available=true){
 const saved=normalizeCart(cart);
 if(!available)return saved;
 return saved.filter(l=>products.some(p=>p.id===l.product_id&&p.stock>0)).map(l=>({...l,quantity:Math.min(l.quantity,products.find(p=>p.id===l.product_id).stock,10)}));
}
export function mergeCarts(first, second) {
  const merged = new Map(normalizeCart(first).map(item => [item.product_id, item]));
  for (const item of normalizeCart(second)) {
    merged.set(item.product_id, { ...item, quantity: Math.max(item.quantity, merged.get(item.product_id)?.quantity || 0) });
  }
  return [...merged.values()].slice(0, 30);
}
export const cartTotal = lines => lines.reduce((sum, line) => sum + line.quantity * line.product.price_paise, 0);
export const money = paise => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(paise / 100);
