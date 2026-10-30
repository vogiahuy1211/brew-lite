import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { assertSession, captureSession, invalidateSession, useSession, verifySession, type SessionIdentity } from './session';

const isBrowser = typeof window !== 'undefined';
const API_BASE_URL = isBrowser ? '' : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
const configuredTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const requestSessions = new WeakMap<InternalAxiosRequestConfig, SessionIdentity>();
apiClient.interceptors.request.use((config) => {
  const path = config.url?.split('?')[0] ?? '';
  const protectedRequest = /^\/(orders|payments)(\/|$)/.test(path);
  const authRequest = path === '/auth/login' || path === '/auth/register';
  config.headers.delete('Authorization');
  if (!protectedRequest && !authRequest) return config;
  const identity = captureSession();
  requestSessions.set(config, identity);
  const adapter = axios.getAdapter(config.adapter);
  config.adapter = async (request) => {
    assertSession(identity);
    if (protectedRequest) {
      let unsubscribe = () => {};
      try {
        await new Promise<void>((resolve, reject) => {
          unsubscribe = useSession.subscribe(() => {
            try { assertSession(identity); } catch (error) { reject(error); }
          });
          verifySession().then(resolve, reject);
        });
      } finally { unsubscribe(); }
      assertSession(identity);
      if (useSession.getState().status !== 'authenticated' || !identity.token) {
        throw new AxiosError('Chưa xác minh được phiên đăng nhập.', 'ERR_AUTH_UNAVAILABLE', request);
      }
      request.headers.Authorization = `Bearer ${identity.token}`;
    }
    assertSession(identity);
    return adapter(request);
  };
  return config;
}, (error) => { throw error; }, { synchronous: true });

apiClient.interceptors.response.use((response) => {
  const identity = requestSessions.get(response.config);
  if (identity) assertSession(identity);
  return response;
}, (error: unknown) => {
  if (axios.isAxiosError(error) && error.config) {
    const identity = requestSessions.get(error.config);
    // Đăng nhập thất bại không làm mất hiệu lực của phiên hiện có.
    if (identity && error.response?.status === 401
      && /^\/(orders|payments)(\/|$)/.test(error.config.url ?? '')) invalidateSession(identity);
  }
  return Promise.reject(error);
});

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  }
  return error instanceof Error ? error.message : fallback;
}

export async function getProducts() {
  const res = await apiClient.get('/products');
  return res.data;
}

export async function getProduct(id: string) {
  const res = await apiClient.get(`/products/${id}`);
  return res.data;
}

export async function getToppings() {
  const res = await apiClient.get('/toppings');
  return res.data;
}

export async function validatePromotion(code: string) {
  const res = await apiClient.get(`/promotions/validate?code=${encodeURIComponent(code)}`);
  return res.data;
}

export async function register(data: { email: string; password: string }) {
  const res = await apiClient.post('/auth/register', data);
  return res.data;
}

export async function login(data: { email: string; password: string }) {
  const res = await apiClient.post('/auth/login', data);
  return res.data;
}

export async function createOrder(data: {
  items: Array<{ productId: string; size: string; qty: number; toppingIds?: string[] }>;
  promoCode?: string;
}) {
  const res = await apiClient.post('/orders', data);
  return res.data;
}

export async function processPayment(data: {
  orderId: string;
  idempotencyKey: string;
  method: 'WALLET' | 'CARD';
  simulateFailure?: boolean;
}) {
  const res = await apiClient.post('/payments', data);
  return res.data;
}

export async function getMyOrders() {
  const res = await apiClient.get('/orders/me');
  return res.data;
}

export async function getOrder(id: string) {
  const res = await apiClient.get(`/orders/${id}`);
  return res.data;
}

export async function updateOrderStatus(id: string, status: string) {
  const res = await apiClient.patch(`/orders/${id}/status`, { status });
  return res.data;
}

// ── Inventory & Recipe APIs ──
export async function getIngredients() {
  const res = await apiClient.get('/inventory/ingredients');
  return res.data;
}

export async function createIngredient(data: {
  name: string;
  unit: string;
  stockQuantity: number;
  minThreshold: number;
  costPerUnit: number;
}) {
  const res = await apiClient.post('/inventory/ingredients', data);
  return res.data;
}

export async function restockIngredient(id: string, amount: number, reason?: string) {
  const res = await apiClient.patch(`/inventory/ingredients/${id}/restock`, { amount, reason });
  return res.data;
}

export async function getInventoryLogs(limit: number = 50) {
  const res = await apiClient.get(`/inventory/logs?limit=${limit}`);
  return res.data;
}

export async function getRecipes() {
  const res = await apiClient.get('/recipes');
  return res.data;
}

export async function getOrderRecipeBreakdown(orderId: string) {
  const res = await apiClient.get(`/recipes/order/${orderId}`);
  return res.data;
}

export async function getAllOrders() {
  const res = await apiClient.get('/orders');
  return res.data;
}

export async function updateRecipeItem(id: string, amountNeeded: number) {
  const res = await apiClient.patch(`/recipes/item/${id}`, { amountNeeded });
  return res.data;
}

export async function createRecipeItem(data: {
  productId: string;
  ingredientId: string;
  amountNeeded: number;
  size?: 'S' | 'M' | 'L';
}) {
  const res = await apiClient.post('/recipes/item', data);
  return res.data;
}

export async function deleteRecipeItem(id: string) {
  const res = await apiClient.delete(`/recipes/item/${id}`);
  return res.data;
}

export async function createVNPayUrl(orderId: string, returnUrl?: string) {
  const res = await apiClient.post('/payments/vnpay/create-url', { orderId, returnUrl });
  return res.data;
}

export async function verifyVNPayReturn(params: Record<string, string>) {
  const res = await apiClient.get('/payments/vnpay/return', { params });
  return res.data;
}

export async function checkCartLimits(items: Array<{
  id?: string;
  productId: string;
  size: string;
  qty: number;
  toppingIds?: string[];
}>) {
  const res = await apiClient.post('/recipes/check-limits', { items });
  return res.data as {
    limits: Record<string, {
      canIncrease: boolean;
      maxQty: number;
      limitingIngredient?: string;
    }>;
  };
}
