'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, ArrowRight, Home, RefreshCw, ShoppingCart } from 'lucide-react';
import { verifyVNPayReturn, createVNPayUrl } from '@/services/api';
import { useCartStore } from '@/store/cart';
import { clearCheckoutAttempt } from '@/services/checkoutAttempt';

export default function VNPayReturnClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    orderId?: string;
    code?: string;
    message?: string;
    isCancelled?: boolean;
  } | null>(null);

  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      params[key] = val;
    });

    if (Object.keys(params).length === 0) {
      setResult({ success: false, message: 'Không có dữ liệu phản hồi từ cổng VNPay' });
      setLoading(false);
      return;
    }

    verifyVNPayReturn(params)
      .then((data: any) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err: any) => {
        setResult({
          success: false,
          code: 'ERR_VERIFY',
          message: err?.response?.data?.message || err?.message || 'Không thể xác minh chữ ký giao dịch VNPay',
        });
        setLoading(false);
      });
  }, [searchParams]);

  // Xử lý giỏ hàng dựa trên kết quả giao dịch
  useEffect(() => {
    if (loading || !result) return;

    if (result.success) {
      // Thanh toán THÀNH CÔNG -> Xóa giỏ hàng
      useCartStore.getState().clearCart();
      clearCheckoutAttempt();
    } else {
      // Thanh toán THẤT BẠI hoặc HỦY -> GIỮ NGUYÊN GIỎ HÀNG và đếm ngược quay về /cart
      clearCheckoutAttempt();
      setCountdown(4);
    }
  }, [loading, result]);

  // Bộ đếm ngược tự động chuyển về trang /cart khi thất bại
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      router.push('/cart');
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <h3 className="font-bold text-gray-800 text-sm">Đang đối chiếu kết quả giao dịch với VNPay...</h3>
        <p className="text-xs text-gray-500 mt-1">Vui lòng đợi giây lát, không đóng trình duyệt.</p>
      </div>
    );
  }

  const isSuccess = result?.success === true;
  const isCancelled = result?.isCancelled || searchParams.get('vnp_ResponseCode') === '24';
  const orderId = result?.orderId || searchParams.get('vnp_TxnRef');
  const amount = Number(searchParams.get('vnp_Amount') || 0) / 100;
  const bankCode = searchParams.get('vnp_BankCode');
  const transactionNo = searchParams.get('vnp_TransactionNo');
  const responseCode = result?.code || searchParams.get('vnp_ResponseCode') || 'N/A';

  const handleRetryPayment = async () => {
    if (!orderId || retrying) return;
    setRetrying(true);
    setCountdown(null); // Dừng đếm ngược nếu người dùng bấm thử lại
    try {
      const returnUrl = window.location.origin + '/orders/vnpay-return';
      const res = await createVNPayUrl(orderId, returnUrl);
      window.location.href = res.paymentUrl;
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Không thể tạo lại liên kết thanh toán. Vui lòng thanh toán lại từ giỏ hàng.');
      setRetrying(false);
      setCountdown(3);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-3xl p-6 text-center border border-gray-100 shadow-sm space-y-4">
          {/* Icon trạng thái */}
          <div
            className={`w-16 h-16 ${
              isSuccess
                ? 'bg-green-100 text-green-600'
                : isCancelled
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-600'
            } rounded-full flex items-center justify-center mx-auto shadow-inner`}
          >
            {isSuccess ? (
              <CheckCircle2 size={40} />
            ) : isCancelled ? (
              <AlertCircle size={40} />
            ) : (
              <XCircle size={40} />
            )}
          </div>

          {/* Tiêu đề & Thông báo */}
          <div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                isSuccess
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : isCancelled
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : 'text-red-700 bg-red-50 border-red-200'
              }`}
            >
              {isSuccess ? 'GIAO DỊCH THÀNH CÔNG' : isCancelled ? 'GIAO DỊCH ĐÃ HỦY' : 'THANH TOÁN THẤT BẠI'}
            </span>

            <h2 className="text-xl font-black text-gray-900 mt-2">
              {isSuccess
                ? 'Thanh toán VNPay thành công!'
                : isCancelled
                ? 'Bạn đã hủy thanh toán'
                : 'Thanh toán không thành công'}
            </h2>

            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              {isSuccess
                ? 'Đơn hàng của bạn đã được chuyển sang bộ phận pha chế.'
                : isCancelled
                ? 'Bạn đã chọn quay lại hoặc hủy giao dịch trên VNPay. Đơn hàng chưa được trừ tiền.'
                : result?.message || 'Có lỗi xảy ra trong quá trình trừ tiền từ ngân hàng.'}
            </p>
          </div>

          {/* Hộp thông báo giữ nguyên giỏ hàng (Khi thất bại / Hủy) */}
          {!isSuccess && (
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-2.5">
              <ShoppingCart size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Đơn hàng vẫn còn trong giỏ ({totalItems} món)</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Các món bạn đã chọn không bị mất, bạn có thể kiểm tra hoặc thử lại bất cứ lúc nào.
                </p>
              </div>
            </div>
          )}

          {/* Thông báo tự động chuyển về giỏ hàng */}
          {!isSuccess && countdown !== null && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 font-medium">
              <RefreshCw size={12} className="animate-spin text-amber-600" />
              <span>
                Tự động quay lại giỏ hàng sau <strong className="text-gray-900">{countdown}s</strong>...
              </span>
            </div>
          )}

          {/* Chi tiết giao dịch */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left space-y-2 text-xs">
            {orderId && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-gray-800">#{orderId.slice(0, 8).toUpperCase()}</span>
              </div>
            )}
            {amount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Số tiền:</span>
                <span className="font-bold text-amber-600 text-sm">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
                </span>
              </div>
            )}
            {bankCode && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Ngân hàng thanh toán:</span>
                <span className="font-semibold text-gray-800">{bankCode}</span>
              </div>
            )}
            {transactionNo && transactionNo !== '0' && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Mã GD VNPay:</span>
                <span className="font-mono text-gray-800">{transactionNo}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-gray-200/60">
              <span className="text-gray-500">Mã phản hồi:</span>
              <span
                className={`font-mono font-bold ${
                  isSuccess ? 'text-green-600' : isCancelled ? 'text-amber-700' : 'text-red-600'
                }`}
              >
                {responseCode} {isCancelled && '(Người dùng hủy)'}
              </span>
            </div>
          </div>

          {/* Các nút hành động xử lý */}
          <div className="space-y-2 pt-2">
            {isSuccess ? (
              <>
                {orderId && (
                  <Link
                    href={`/orders/${orderId}`}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
                  >
                    Xem chi tiết đơn hàng
                    <ArrowRight size={14} />
                  </Link>
                )}
                <Link
                  href="/"
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Home size={14} />
                  Về trang thực đơn
                </Link>
              </>
            ) : (
              <>
                {/* Nút quay lại giỏ hàng ngay */}
                <Link
                  href="/cart"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <ShoppingCart size={15} />
                  Quay lại giỏ hàng ngay ({totalItems} món)
                </Link>

                {/* Nút thanh toán lại qua VNPay */}
                {orderId && (
                  <button
                    onClick={handleRetryPayment}
                    disabled={retrying}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-semibold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
                    {retrying ? 'Đang mở lại VNPay...' : 'Thử thanh toán lại với VNPay'}
                  </button>
                )}

                <Link
                  href="/"
                  className="w-full py-2 text-gray-500 hover:text-gray-800 text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Home size={13} />
                  Quay lại chọn món khác
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
