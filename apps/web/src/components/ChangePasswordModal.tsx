'use client';

import { useState } from 'react';
import { KeyRound, Eye, EyeOff, X, CheckCircle, AlertCircle } from 'lucide-react';
import { changePassword, apiErrorMessage } from '@/services/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword === currentPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu mới');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      setSuccess(res.message || 'Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1800);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 id="change-password-title" className="text-base font-extrabold text-gray-900">Đổi mật khẩu</h3>
              <p className="text-xs text-gray-500 font-normal">Cập nhật mật khẩu bảo vệ tài khoản</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3.5 bg-green-50 border border-green-200 rounded-2xl text-xs font-semibold text-green-700 animate-in fade-in">
              <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Mật khẩu hiện tại</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang dùng"
                disabled={loading || !!success}
                className="w-full px-4 py-2.5 pr-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Toggle password visibility"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                disabled={loading || !!success}
                className="w-full px-4 py-2.5 pr-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Toggle password visibility"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                disabled={loading || !!success}
                className="w-full px-4 py-2.5 pr-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Toggle password visibility"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !!success}
              className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{loading ? 'Đang cập nhật...' : 'Xác nhận đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
