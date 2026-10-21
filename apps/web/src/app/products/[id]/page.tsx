'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, Plus, Minus, ShoppingCart, AlertTriangle } from 'lucide-react';
import { getProduct, getToppings, checkCartLimits } from '@/services/api';
import { Product, Topping, ItemSize } from '@/types/product';
import { useCartStore, SIZE_SURCHARGES } from '@/store/cart';
import { useHydrated } from '@/hooks/useHydrated';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const mounted = useHydrated();

  const [product, setProduct] = useState<Product | null>(null);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSize, setSelectedSize] = useState<ItemSize>('M');
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [maxAllowedQty, setMaxAllowedQty] = useState<number>(99);
  const [limitingName, setLimitingName] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const totalCartItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    Promise.all([getProduct(id), getToppings()])
      .then(([prodData, topData]) => {
        setProduct(prodData);
        setToppings(topData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải chi tiết sản phẩm');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!product) return;
    checkCartLimits([
      {
        productId: product.id,
        size: selectedSize,
        qty: 1,
        toppingIds: selectedToppings.map((t) => t.id),
      },
    ])
      .then((res) => {
        const itemLimit = Object.values(res?.limits || {})[0];
        if (itemLimit) {
          const cap = Math.min(product.stock, itemLimit.maxQty);
          setMaxAllowedQty(cap);
          setLimitingName(itemLimit.limitingIngredient || null);
          setQty((prev) => (cap > 0 ? Math.min(prev, cap) : 1));
        } else {
          setMaxAllowedQty(product.stock);
        }
      })
      .catch(() => {
        setMaxAllowedQty(product.stock);
      });
  }, [product, selectedSize, selectedToppings]);

  const toggleTopping = (topping: Topping) => {
    if (selectedToppings.some((t) => t.id === topping.id)) {
      setSelectedToppings(selectedToppings.filter((t) => t.id !== topping.id));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <span className="text-5xl mb-2">😢</span>
        <h2 className="text-base font-bold text-gray-800">Không tìm thấy món</h2>
        <Link href="/" className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const basePrice = product.price;
  const sizePrice = SIZE_SURCHARGES[selectedSize];
  const toppingsPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0);
  const unitPrice = basePrice + sizePrice + toppingsPrice;
  const totalPrice = unitPrice * qty;

  const handleAddToCart = async () => {
    if (submitting || product.stock <= 0 || maxAllowedQty <= 0) return;
    setSubmitting(true);
    setActionError(null);

    const res = await addItem(product, selectedSize, selectedToppings, qty);
    setSubmitting(false);

    if (res.ok) {
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        router.push('/cart');
      }, 450);
    } else {
      setActionError(res.message || 'Không thể thêm sản phẩm vào giỏ hàng');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 max-w-lg mx-auto flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-sm font-bold text-gray-800 line-clamp-1">{product.name}</h2>
        <Link
          href="/cart"
          aria-label="Xem giỏ hàng"
          className="relative p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ShoppingCart size={20} />
          {mounted && totalCartItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {totalCartItems > 99 ? '99+' : totalCartItems}
            </span>
          )}
        </Link>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {actionError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-sm"
          >
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
        )}

        {/* Ảnh sản phẩm */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">☕</div>
          )}
        </div>

        {/* Tên & Giá cơ sở */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">{product.name}</h1>
          <p className="text-xl font-extrabold text-amber-600 mt-1">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
          </p>
          {product.stock > 0 && maxAllowedQty > 0 ? (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sẵn sàng pha chế (còn {product.stock})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-2.5 py-0.5 rounded-full">
                Tạm hết món (Hết hàng hoặc nguyên liệu)
              </span>
            </div>
          )}
        </div>

        {/* Chọn Size */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">1. Chọn Size (bắt buộc)</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['S', 'M', 'L'] as ItemSize[]).map((size) => {
              const isSelected = selectedSize === size;
              const surcharge = SIZE_SURCHARGES[size];
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-sm">Size {size}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {surcharge > 0 ? `+${surcharge / 1000}k` : 'Chuẩn'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chọn Topping */}
        {toppings.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">2. Thêm Topping (tùy chọn)</h3>
            <div className="space-y-2">
              {toppings.map((top) => {
                const isChecked = selectedToppings.some((t) => t.id === top.id);
                return (
                  <button
                    key={top.id}
                    type="button"
                    onClick={() => toggleTopping(top)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      isChecked
                        ? 'border-amber-500 bg-amber-50/60 text-amber-900'
                        : 'border-gray-100 text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check size={13} strokeWidth={3} />}
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{top.name}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-700">
                      +{new Intl.NumberFormat('vi-VN').format(top.price)}đ
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chọn Số Lượng */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">Số lượng</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 active:bg-gray-100"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-bold text-sm text-gray-900">{qty}</span>
              <button
                disabled={qty >= maxAllowedQty}
                onClick={() => {
                  if (qty < maxAllowedQty) setQty((q) => q + 1);
                }}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                  qty >= maxAllowedQty
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-700 active:bg-gray-100'
                }`}
                title={qty >= maxAllowedQty ? `Tối đa ${maxAllowedQty} ly` : 'Tăng số lượng'}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {maxAllowedQty < 99 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg mt-2.5 font-medium text-right">
              {maxAllowedQty <= 0
                ? `Hết nguyên liệu "${limitingName || 'thành phần'}" trong kho`
                : `Tối đa ${maxAllowedQty} ly khả dụng trong kho`}
            </p>
          )}
        </div>
      </main>

      {/* Floating Bottom Add Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-30 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-gray-500">Tạm tính</p>
            <p className="text-lg font-black text-amber-600">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={submitting || product.stock === 0 || maxAllowedQty <= 0}
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:bg-gray-300 text-white font-bold rounded-2xl text-sm transition-all shadow-md"
          >
            {submitting ? 'Đang thêm...' : added ? '✓ Đã thêm vào giỏ' : 'Thêm vào giỏ'}
          </button>
        </div>
      </div>
    </div>
  );
}
