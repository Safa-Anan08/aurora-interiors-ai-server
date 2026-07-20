// e2eVerify.ts – Executes real API calls against the locally running server and records evidence
import fetch, { RequestInit } from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const results: Record<string, any> = {};

async function request(method: string, url: string, init?: RequestInit) {
  const res = await fetch(url, { method, ...init, redirect: 'manual' });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch (_) { }
  return { status: res.status, headers: res.headers.raw(), body: json ?? text };
}

async function main() {
  // 1. Register test user (may already exist)
  const email = `qa_user_${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const register = await request('POST', `${API}/api/auth/register`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  results.register = register;

  // 2. Login
  const login = await request('POST', `${API}/api/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  results.login = login;
  const setCookie = login.headers['set-cookie']?.[0] || '';
  const cookie = setCookie.split(';')[0];

  const authHeaders = { Cookie: cookie };
  const authGet = (url: string) => request('GET', url, { headers: authHeaders });

  // 3. Products list
  results.productsList = await authGet(`${API}/api/marketplace/products?page=1&limit=5`);

  // 4. Product detail (first id)
  const firstProdId = results.productsList.body?.products?.[0]?.id;
  if (firstProdId) {
    results.productDetail = await authGet(`${API}/api/products/${firstProdId}`);
  }

  // 5. Product search
  results.productsSearch = await authGet(`${API}/api/marketplace/products?search=Lamp`);

  // 6. Product filter (category example – assume "Lighting" exists)
  results.productsFilter = await authGet(`${API}/api/marketplace/products?category=Lighting`);

  // 7. Products pagination (page 2)
  results.productsPage2 = await authGet(`${API}/api/marketplace/products?page=2&limit=5`);

  // 8. Designs list
  results.designsList = await authGet(`${API}/api/designs?page=1&limit=5`);

  const firstDesignId = results.designsList.body?.designs?.[0]?.id;
  if (firstDesignId) {
    results.designDetail = await authGet(`${API}/api/designs/${firstDesignId}`);
  }

  // 9. Designs search
  results.designsSearch = await authGet(`${API}/api/designs?search=Living`);

  // 10. Designs filter (style example)
  results.designsFilter = await authGet(`${API}/api/designs?style=Modern`);

  // 11. Wishlist add/remove
  if (firstProdId) {
    results.wishlistAdd = await request('POST', `${API}/api/wishlist/add`, {
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ productId: firstProdId })
    });
    results.wishlistGet = await authGet(`${API}/api/wishlist`);
    results.wishlistRemove = await request('POST', `${API}/api/wishlist/remove`, {
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ productId: firstProdId })
    });
    results.wishlistAfter = await authGet(`${API}/api/wishlist`);
  }

  // 12. Cart operations
  if (firstProdId) {
    results.cartAdd = await request('POST', `${API}/api/cart/add`, {
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ productId: firstProdId, quantity: 2 })
    });
    results.cartGet = await authGet(`${API}/api/cart`);
    results.cartUpdate = await request('POST', `${API}/api/cart/update-qty`, {
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ productId: firstProdId, quantity: 3 })
    });
    results.cartAfterUpdate = await authGet(`${API}/api/cart`);
    results.cartRemove = await request('POST', `${API}/api/cart/remove`, {
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ productId: firstProdId })
    });
    results.cartAfterRemove = await authGet(`${API}/api/cart`);
  }

  // 13. Protected dashboard route
  results.dashboard = await authGet(`${API}/api/dashboard`);

  // 14. Stripe checkout session (test mode) – only if Stripe key present
  try {
    const checkout = await request('POST', `${API}/api/checkout/create-session`, {
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({})
    });
    results.checkout = checkout;
  } catch (e) {
    results.checkout = { error: (e as any).toString() };
  }

  const outFile = path.resolve('e2e_output.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf-8');
  console.log('E2E verification completed. Output saved to', outFile);
}

main().catch(err => {
  console.error('E2E script error', err);
  process.exit(1);
});
