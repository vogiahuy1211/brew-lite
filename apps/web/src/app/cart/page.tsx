'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { checkCartLimits } from '@/services/api';
import { useSession } from '@/services/session';

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const [limits, setLimits] = useState<
    Record<string, { canIncrease: boolean; maxQty: number; limitingIngredient?: string }>
  >({});
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});

  const sessionStatus = useSession((state) => state.status);
  const items = useCartStore((state) => state.items);
  const loading = useCartStore((state) => state.loading);
  const apiError = useCartStore((state) => state.error);
  const clearError = useCartStore((state) => state.clearError);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const updateQty = useCartStore((state) => state.updateQty);
  const setItemQty = useCartStore((state) => state.setItemQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
    try {
      sessionStorage.removeItem('brewlite_checkout_attempt');
    } catch {}
  }, []);

  // Đồng bộ giỏ hàng mới nhất từ Database khi vào trang
  useEffect(() => {
    if (!mounted) return;
    if (sessionStatus === 'authenticated') {
      void fetchCart();
    }
  }, [mounted, sessionStatus, fetchCart]);

  // Đồng bộ giá trị ô nhập số lượng khi items thay đổi
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const item of items) {
      map[item.id] = String(item.qty);
    }
    setQtyInputs(map);
  }, [items]);

  useEffect(() => {
    if (!mounted || items.length === 0) {
      setLimits({});
      return;
    }

    checkCartLimits(
      items.map((i) => ({
        id: i.id,
        productId: i.productId,
        size: i.size,
        qty: i.qty,
        toppingIds: (i.toppings || []).map((t) => t.id),
      })),
    )
      .then((res) => {
        if (res && res.limits) {
          setLimits(res.limits);
        }
      })
      .catch((err) => {
        console.error('Lỗi kiểm tra giới hạn tồn kho nguyên liệu:', err);
      });
  }, [items, mounted]);

  const showWarning = (msg: string) => {
    setLimitWarning(msg);
    setTimeout(() => setLimitWarning(null), 4000);
  };

  const handleIncreaseQty = async (item: any) => {
    clearError();
    const itemLimit = limits[item.id];
    const maxFromItem = item.maxAvailableQty ?? itemLimit?.maxQty ?? 99;
    const cannotIncrease =
      (itemLimit && !itemLimit.canIncrease) ||
      item.canIncrease === false ||
      item.qty >= maxFromItem;

    if (cannotIncrease) {
      const reason = item.limitingIngredient || itemLimit?.limitingIngredient;
      showWarning(
        reason
          ? `Không thể tăng thêm: Nguyên liệu "${reason}" chỉ còn đủ để pha tối đa ${maxFromItem} ly!`
          : `Không thể tăng thêm: Tồn kho sản phẩm chỉ còn tối đa ${maxFromItem} phần!`,
      );
      return;
    }

    setLimitWarning(null);
    const res = await updateQty(item.id, 1);
    if (!res.ok && res.message) {
      showWarning(res.message);
    }
  };

  const handleDirectQtyCommit = async (item: any) => {
    const raw = qtyInputs[item.id];
    const parsed = Number.parseInt(raw || '', 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setQtyInputs((prev) => ({ ...prev, [item.id]: String(item.qty) }));
      showWarning('Số lượng phải là số nguyên dương (>= 1)');
      return;
    }
    if (parsed === item.qty) return;

    const itemLimit = limits[item.id];
    const maxAllowed = item.maxAvailableQty ?? itemLimit?.maxQty ?? 99;
    if (parsed > maxAllowed) {
      setQtyInputs((prev) => ({ ...prev, [item.id]: String(item.qty) }));
      showWarning(`Số lượng yêu cầu (${parsed}) vượt quá tồn kho khả dụng (${maxAllowed})!`);
      return;
    }

    const res = await setItemQty(item.id, parsed);
    if (!res.ok && res.message) {
      setQtyInputs((prev) => ({ ...prev, [item.id]: String(item.qty) }));
      showWarning(res.message);
    }
  };

  const hasUnavailableItem = items.some(
    (item) =>
      item.isAvailable === false ||
      item.stockStatus === 'OUT_OF_STOCK' ||
      item.stockStatus === 'INSUFFICIENT_STOCK' ||
      (item.maxAvailableQty !== undefined && item.qty > item.maxAvailableQty),
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-base font-bold text-gray-800">
            Giỏ hàng của bạn ({totalItems})
          </h2>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (confirm('Bạn có chắc muốn xóa toàn bộ sản phẩm trong giỏ hàng?')) {
                void clearCart();
              }
            }}
            className="text-xs text-red-500 font-semibold hover:underline disabled:opacity-50"
          >
            Xóa hết
          </button>
        )}
      </div>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Thông báo lỗi từ API hoặc cảnh báo tồn kho */}
        {(limitWarning || apiError) && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span className="font-medium">{limitWarning || apiError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLimitWarning(null);
                clearError();
              }}
              className="text-[11px] font-bold text-amber-800 hover:underline shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Loading state khi lần đầu tải giỏ hàng */}
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium text-gray-500">Đang đồng bộ giỏ hàng...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-3">🛒</span>
            <h3 className="text-base font-bold text-gray-800">Giỏ hàng đang trống</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Hãy chọn những ly cà phê thơm ngon từ menu của chúng tôi nhé!
            </p>
            <Link
              href="/"
              className="mt-5 px-6 py-2.5 bg-amber-500 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-amber-600 transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => {
                const itemLimit = limits[item.id];
                const maxAvailable = item.maxAvailableQty ?? itemLimit?.maxQty ?? 99;
                const isOutOfStock =
                  item.stockStatus === 'OUT_OF_STOCK' || maxAvailable <= 0;
                const isInsufficient =
                  item.stockStatus === 'INSUFFICIENT_STOCK' || item.qty > maxAvailable;
                const isMaxReached =
                  (itemLimit && !itemLimit.canIncrease) ||
                  item.canIncrease === false ||
                  item.qty >= maxAvailable;
                const limitingIng =
                  item.limitingIngredient || itemLimit?.limitingIngredient;

                return (
                  <div
                    key={item.id}
                    className={`bg-white p-3.5 rounded-2xl border shadow-sm flex items-start gap-3 ${
                      isOutOfStock || isInsufficient
                        ? 'border-red-200 bg-red-50/20'
                        : 'border-gray-100'
                    }`}
                  >
                    {/* Hình ảnh sản phẩm */}
                    <Link
                      href={`/products/${item.productId}`}
                      className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          ☕
                        </div>
                      )}
                    </Link>

                    {/* Thông tin sản phẩm */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.productId}`}>
                        <h4 className="font-bold text-sm text-gray-900 leading-tight hover:text-amber-700 transition-colors truncate">
                          {item.name}
                        </h4>
                      </Link>
                      <p className="text-xs font-semibold text-amber-700 mt-0.5">
                        Size {item.size}
                      </p>
                      {item.toppings && item.toppings.length > 0 && (
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                          Topping: {item.toppings.map((t) => t.name).join(', ')}
                        </p>
                      )}

                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="text-[11px] text-gray-500">
                          Đơn giá:{' '}
                          <strong className="text-gray-700">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(item.price)}
                          </strong>
                        </span>
                        <span className="text-xs font-extrabold text-amber-700">
                          Thành tiền:{' '}
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(item.price * item.qty)}
                        </span>
                      </div>

                      {isOutOfStock ? (
                        <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg mt-1.5 font-semibold inline-block">
                          ❌ Sản phẩm hiện đã hết hàng hoặc hết nguyên liệu
                        </p>
                      ) : isInsufficient ? (
                        <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg mt-1.5 font-semibold inline-block">
                          ⚠️ Vượt tồn kho! Hiện chỉ còn tối đa {maxAvailable} phần
                        </p>
                      ) : isMaxReached ? (
                        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg mt-1.5 font-medium inline-block">
                          ⚠️ Đạt tối đa ({item.qty} phần)
                          {limitingIng ? ` theo nguyên liệu "${limitingIng}"` : ''}
                        </p>
                      ) : null}
                    </div>

                    {/* Cụm nút Xóa & Tăng/Giảm/Nhập số lượng */}
                    <div className="flex flex-col items-end justify-between h-full gap-3 shrink-0">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 disabled:opacity-50"
                        title="Xóa món"
                        aria-label={`Xóa ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="flex items-center gap-1 border border-gray-200 rounded-xl px-1.5 py-1 bg-white">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setLimitWarning(null);
                            clearError();
                            void updateQty(item.id, -1);
                          }}
                          className="p-0.5 text-gray-600 hover:text-black active:scale-95 disabled:opacity-40"
                          title="Giảm số lượng"
                          aria-label="Giảm số lượng"
                        >
                          <Minus size={13} />
                        </button>

                        <input
                          type="number"
                          min={1}
                          max={maxAvailable > 0 ? maxAvailable : 99}
                          aria-label={`Số lượng ${item.name}`}
                          value={qtyInputs[item.id] ?? String(item.qty)}
                          onChange={(e) =>
                            setQtyInputs((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          onBlur={() => void handleDirectQtyCommit(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-8 text-center text-xs font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <button
                          type="button"
                          disabled={loading || isMaxReached || isOutOfStock}
                          onClick={() => void handleIncreaseQty(item)}
                          className={`p-0.5 active:scale-95 transition-colors ${
                            isMaxReached || isOutOfStock
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-black'
                          }`}
                          title={
                            isMaxReached
                              ? `Đã đạt tối đa (${maxAvailable})`
                              : 'Tăng số lượng'
                          }
                          aria-label="Tăng số lượng"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nút tiếp tục mua sắm */}
            <div className="pt-1">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
              >
                <ShoppingBag size={14} />
                <span>+ Tiếp tục mua sắm thêm món khác</span>
              </Link>
            </div>

            {/* Tóm tắt hóa đơn */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 mt-4 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Tổng số lượng sản phẩm</span>
                <span className="font-bold text-gray-800">{totalItems} món</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(totalPrice)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí dịch vụ</span>
                <span className="text-green-600 font-semibold">Miễn phí</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-bold text-gray-900">
                <span>Tổng tiền giỏ hàng</span>
                <span className="text-base text-amber-600">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(totalPrice)}
                </span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Checkout CTA */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-30 shadow-md">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-gray-500">
                Tổng thanh toán ({totalItems} món)
              </p>
              <p className="text-lg font-black text-amber-600">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(totalPrice)}
              </p>
            </div>
            {hasUnavailableItem ? (
              <button
                type="button"
                disabled
                className="py-3 px-5 bg-gray-300 text-gray-600 font-bold rounded-2xl text-xs cursor-not-allowed"
              >
                Vui lòng chỉnh lại món hết hàng
              </button>
            ) : (
              <Link
                href="/checkout"
                onClick={() => {
                  try {
                    sessionStorage.removeItem('brewlite_checkout_attempt');
                  } catch {}
                }}
                className="py-3 px-6 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-2xl text-sm flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>Thanh toán ngay</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
