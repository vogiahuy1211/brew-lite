'use client';

import { usePathname } from 'next/navigation';
import { Phone, MapPin, Mail, Coffee } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();
  const shoppingPage =
    ['/', '/cart', '/checkout', '/orders'].includes(pathname) ||
    pathname.startsWith('/orders/') ||
    pathname.startsWith('/products/');
  if (!shoppingPage) return null;

  return (
    <footer
      aria-label="Chân trang BrewLite"
      className="mt-auto border-t border-orange-200 bg-white text-gray-700 py-6 pb-28 sm:pb-8 shadow-sm"
    >
      <div className="mx-auto max-w-lg px-4 text-xs space-y-2 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 font-bold text-amber-700 text-sm">
          <Coffee size={16} />
          <span>BrewLite — Coffee & Tea Express</span>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-600">
          <Phone size={14} className="text-amber-600 shrink-0" />
          <span>SĐT: <a href="tel:0816808776" className="font-medium hover:underline">0816808776</a></span>
        </div>
        <div className="flex items-start justify-center sm:justify-start gap-1.5 text-gray-600">
          <MapPin size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <span>Địa chỉ: 273 An Dương Vương, Phường Chợ Quán, Quận 5, TP. Hồ Chí Minh</span>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-600">
          <Mail size={14} className="text-amber-600 shrink-0" />
          <span>Email: <a href="mailto:3123410133@sv.sgu.edu.vn" className="font-medium hover:underline">3123410133@sv.sgu.edu.vn</a></span>
        </div>
        <p className="text-[11px] text-gray-400 pt-1 text-center">
          © 2026 BrewLite · Đồ án môn Công nghệ Phần mềm — SGU
        </p>
      </div>
    </footer>
  );
}
