'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Check } from "lucide-react";
import { Product } from "@/types/product";
import { useCartStore } from "@/store/cart";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(product.price);

  const isOutOfStock = product.stock <= 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || adding) return;

    setAdding(true);
    setFeedback(null);
    const res = await addItem(product, 'M', [], 1);
    setAdding(false);

    if (res.ok) {
      setFeedback({ type: 'success', text: 'Đã thêm vào giỏ' });
      setTimeout(() => setFeedback(null), 2000);
    } else {
      setFeedback({ type: 'error', text: res.message || 'Không thể thêm' });
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-200/80 transition-all duration-300 ${
        isOutOfStock
          ? "opacity-60"
          : "hover:shadow-lg hover:shadow-amber-900/10 hover:border-amber-400 hover:-translate-y-1"
      }`}
    >
      <Link href={`/products/${product.id}`} className="flex flex-col flex-1">
        {/* Product Image */}
        <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              ☕
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-sm font-semibold bg-black/60 px-3 py-1 rounded-full">
                Hết hàng
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-1 p-3 pb-2">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight transition-colors group-hover:text-amber-800">
            {product.name}
          </h3>
          <p className="text-base font-bold text-amber-600">{formattedPrice}</p>
        </div>
      </Link>

      {/* Quick Add to Cart Button */}
      <div className="px-3 pb-3 pt-1">
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={isOutOfStock || adding}
          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            isOutOfStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : feedback?.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-200/80 hover:border-amber-500 active:scale-95"
          }`}
        >
          {adding ? (
            <span>Đang thêm...</span>
          ) : feedback?.type === "success" ? (
            <>
              <Check size={14} />
              <span>{feedback.text}</span>
            </>
          ) : (
            <>
              <ShoppingCart size={14} />
              <span>{isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}</span>
            </>
          )}
        </button>
        {feedback?.type === "error" && (
          <p className="text-[11px] text-red-600 font-medium mt-1.5 text-center leading-tight">
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  );
}
