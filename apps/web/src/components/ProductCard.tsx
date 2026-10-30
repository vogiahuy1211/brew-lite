import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(product.price);

  const isOutOfStock = product.stock === 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-200/80 transition-all duration-300 active:scale-95 ${
        isOutOfStock
          ? "opacity-60 pointer-events-none"
          : "hover:shadow-lg hover:shadow-amber-900/10 hover:border-amber-400 hover:-translate-y-1.5"
      }`}
    >
      {/* Product Image */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
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
      <div className="flex flex-col gap-1 p-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight transition-colors group-hover:text-amber-800">
          {product.name}
        </h3>
        <p className="text-base font-bold text-amber-600">{formattedPrice}</p>
      </div>
    </Link>
  );
}
