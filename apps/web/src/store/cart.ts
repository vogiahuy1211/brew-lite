import { create } from 'zustand';
import { CartItem, Topping, ItemSize, Product, CartResponse } from '@/types/product';
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCartApi,
  syncCartApi,
  apiErrorMessage,
} from '@/services/api';
import { useSession } from '@/services/session';

export const SIZE_SURCHARGES: Record<ItemSize, number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

const GUEST_CART_KEY = 'brewlite_guest_cart';
const LEGACY_CART_KEY = 'brewlite_cart_storage';

function readGuestCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    // Dọn dẹp key cũ của zustand persist nếu còn tồn tại
    localStorage.removeItem(LEGACY_CART_KEY);
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    if (items.length === 0) {
      localStorage.removeItem(GUEST_CART_KEY);
    } else {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
  } catch {
    // ignore storage errors
  }
}

interface CartStore {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  syncedSessionId: string | null;
  clearError: () => void;
  fetchCart: () => Promise<CartResponse | null>;
  syncWithSession: () => Promise<void>;
  addItem: (
    product: Product,
    size: ItemSize,
    toppings: Topping[],
    qty?: number,
  ) => Promise<{ ok: boolean; message?: string }>;
  updateQty: (cartItemId: string, delta: number) => Promise<{ ok: boolean; message?: string }>;
  setItemQty: (cartItemId: string, newQty: number) => Promise<{ ok: boolean; message?: string }>;
  removeItem: (cartItemId: string) => Promise<{ ok: boolean; message?: string }>;
  clearCart: () => Promise<{ ok: boolean; message?: string }>;
  clearLocalCartView: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  loading: false,
  error: null,
  syncedSessionId: null,

  clearError: () => set({ error: null }),

  fetchCart: async () => {
    const session = useSession.getState();
    if (session.status !== 'authenticated' || !session.identity.token) {
      const guestItems = readGuestCart();
      set({ items: guestItems, loading: false });
      return null;
    }

    set({ loading: true, error: null });
    try {
      const data = await getCart();
      set({
        items: Array.isArray(data.items) ? data.items : [],
        loading: false,
        error: null,
      });
      return data;
    } catch (err) {
      const msg = apiErrorMessage(err, 'Không thể tải dữ liệu giỏ hàng từ máy chủ');
      set({ loading: false, error: msg });
      return null;
    }
  },

  syncWithSession: async () => {
    const session = useSession.getState();

    if (session.status === 'checking') {
      return;
    }

    if (session.status !== 'authenticated' || !session.identity.token) {
      // Khi chưa đăng nhập hoặc vừa đăng xuất: chỉ hiển thị giỏ khách tạm thời (nếu có)
      const guestItems = readGuestCart();
      set({
        items: guestItems,
        loading: false,
        error: null,
        syncedSessionId: null,
      });
      return;
    }

    // Đã đăng nhập: nếu có giỏ hàng tạm trước khi đăng nhập thì đồng bộ (merge) lên Database
    const currentSessionKey = `${session.identity.id}:${session.user?.id || ''}`;
    const guestItems = readGuestCart();

    set({ loading: true, error: null });
    try {
      let data: CartResponse;
      if (guestItems.length > 0) {
        data = await syncCartApi(
          guestItems.map((i) => ({
            productId: i.productId,
            quantity: i.qty,
            size: i.size,
            toppingIds: (i.toppings || []).map((t) => t.id),
          })),
        );
        writeGuestCart([]);
      } else {
        data = await getCart();
      }

      set({
        items: Array.isArray(data.items) ? data.items : [],
        loading: false,
        error: null,
        syncedSessionId: currentSessionKey,
      });
    } catch (err) {
      const msg = apiErrorMessage(err, 'Không thể đồng bộ giỏ hàng với máy chủ');
      set({ loading: false, error: msg });
    }
  },

  addItem: async (product, size, toppings, qty = 1) => {
    if (!product || product.stock <= 0 || qty < 1) {
      const message = 'Sản phẩm đã hết hàng hoặc số lượng không hợp lệ';
      set({ error: message });
      return { ok: false, message };
    }

    const session = useSession.getState();
    if (session.status === 'authenticated' && session.identity.token) {
      set({ loading: true, error: null });
      try {
        const data = await addCartItem({
          productId: product.id,
          quantity: qty,
          size,
          toppingIds: toppings.map((t) => t.id),
        });
        set({
          items: Array.isArray(data.items) ? data.items : [],
          loading: false,
          error: null,
        });
        return { ok: true };
      } catch (err) {
        const message = apiErrorMessage(err, 'Không thể thêm sản phẩm vào giỏ hàng');
        set({ loading: false, error: message });
        return { ok: false, message };
      }
    }

    // Chế độ khách (chưa đăng nhập): lưu tạm vào guest cart, sẽ đồng bộ vào DB ngay khi đăng nhập
    const sortedToppingIds = toppings.map((t) => t.id).sort().join('-');
    const cartItemId = `${product.id}-${size}-${sortedToppingIds}`;
    const toppingTotal = toppings.reduce((sum, t) => sum + t.price, 0);
    const unitPrice = product.price + SIZE_SURCHARGES[size] + toppingTotal;

    const currentItems = get().items;
    const existing = currentItems.find((i) => i.id === cartItemId);
    const currentProductTotalQty = currentItems
      .filter((i) => i.productId === product.id)
      .reduce((sum, i) => sum + i.qty, 0);

    if (currentProductTotalQty + qty > product.stock) {
      const message = `Số lượng sản phẩm "${product.name}" vượt quá tồn kho hiện có (${product.stock})`;
      set({ error: message });
      return { ok: false, message };
    }

    const nextItems = existing
      ? currentItems.map((i) =>
          i.id === cartItemId ? { ...i, qty: i.qty + qty, quantity: i.qty + qty } : i,
        )
      : [
          ...currentItems,
          {
            id: cartItemId,
            productId: product.id,
            name: product.name,
            price: unitPrice,
            unitPrice,
            imageUrl: product.imageUrl,
            size,
            toppings,
            qty,
            quantity: qty,
            stock: product.stock,
            isAvailable: product.stock > 0,
          },
        ];

    writeGuestCart(nextItems);
    set({ items: nextItems, error: null });
    return { ok: true };
  },

  setItemQty: async (cartItemId, newQty) => {
    if (!Number.isInteger(newQty) || newQty < 0) {
      const message = 'Số lượng không hợp lệ';
      set({ error: message });
      return { ok: false, message };
    }

    if (newQty === 0) {
      return get().removeItem(cartItemId);
    }

    const session = useSession.getState();
    if (session.status === 'authenticated' && session.identity.token) {
      set({ loading: true, error: null });
      try {
        const data = await updateCartItem(cartItemId, newQty);
        set({
          items: Array.isArray(data.items) ? data.items : [],
          loading: false,
          error: null,
        });
        return { ok: true };
      } catch (err) {
        const message = apiErrorMessage(err, 'Không thể cập nhật số lượng sản phẩm');
        set({ loading: false, error: message });
        return { ok: false, message };
      }
    }

    const currentItems = get().items;
    const target = currentItems.find((i) => i.id === cartItemId);
    if (!target) {
      return { ok: false, message: 'Không tìm thấy sản phẩm trong giỏ' };
    }

    if (target.stock !== undefined && newQty > target.stock) {
      const message = `Số lượng tối đa cho sản phẩm này là ${target.stock}`;
      set({ error: message });
      return { ok: false, message };
    }

    const nextItems = currentItems.map((item) =>
      item.id === cartItemId ? { ...item, qty: newQty, quantity: newQty } : item,
    );
    writeGuestCart(nextItems);
    set({ items: nextItems, error: null });
    return { ok: true };
  },

  updateQty: async (cartItemId, delta) => {
    const item = get().items.find((i) => i.id === cartItemId);
    if (!item) {
      return { ok: false, message: 'Sản phẩm không tồn tại trong giỏ hàng' };
    }
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      return get().removeItem(cartItemId);
    }
    return get().setItemQty(cartItemId, newQty);
  },

  removeItem: async (cartItemId) => {
    const session = useSession.getState();
    if (session.status === 'authenticated' && session.identity.token) {
      set({ loading: true, error: null });
      try {
        const data = await removeCartItem(cartItemId);
        set({
          items: Array.isArray(data.items) ? data.items : [],
          loading: false,
          error: null,
        });
        return { ok: true };
      } catch (err) {
        const message = apiErrorMessage(err, 'Không thể xóa sản phẩm khỏi giỏ hàng');
        set({ loading: false, error: message });
        return { ok: false, message };
      }
    }

    const nextItems = get().items.filter((item) => item.id !== cartItemId);
    writeGuestCart(nextItems);
    set({ items: nextItems, error: null });
    return { ok: true };
  },

  clearCart: async () => {
    const session = useSession.getState();
    if (session.status === 'authenticated' && session.identity.token) {
      set({ loading: true, error: null });
      try {
        const data = await clearCartApi();
        set({
          items: Array.isArray(data.items) ? data.items : [],
          loading: false,
          error: null,
        });
        return { ok: true };
      } catch (err) {
        const message = apiErrorMessage(err, 'Không thể xóa toàn bộ giỏ hàng');
        set({ loading: false, error: message });
        return { ok: false, message };
      }
    }

    writeGuestCart([]);
    set({ items: [], error: null });
    return { ok: true };
  },

  clearLocalCartView: () => {
    writeGuestCart([]);
    set({ items: [], error: null, syncedSessionId: null });
  },

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.qty, 0);
  },

  getTotalPrice: () => {
    return get().items.reduce((total, item) => total + item.price * item.qty, 0);
  },
}));
