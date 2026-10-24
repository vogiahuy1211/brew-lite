export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export type ItemSize = 'S' | 'M' | 'L';

export interface CartItem {
  id: string; // UUID in DB (or composite key for temporary guest cart)
  cartId?: string;
  productId: string;
  name: string;
  price: number; // unit price (base + size + toppings) from DB
  unitPrice?: number;
  basePrice?: number;
  sizeSurcharge?: number;
  toppingsPrice?: number;
  imageUrl: string | null;
  size: ItemSize;
  toppings: Topping[];
  qty: number;
  quantity?: number;
  subtotal?: number;
  lineTotal?: number;
  stock?: number;
  productStock?: number;
  maxAvailableQty?: number;
  isAvailable?: boolean;
  stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';
  canIncrease?: boolean;
  limitingIngredient?: string | null;
}

export interface CartResponse {
  id: string | null;
  userId: string;
  items: CartItem[];
  totalItems: number;
  totalQuantity: number;
  totalPrice: number;
  updatedAt: string | null;
}

export interface User {
  id: string;
  email: string;
  loyalty_points: number;
  role?: string;
}
