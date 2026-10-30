'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Package, 
  Layers, 
  History, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  LogOut, 
  Search, 
  X, 
  ArrowDownRight, 
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Coffee,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Trash2
} from 'lucide-react';
import { 
  getIngredients, 
  createIngredient, 
  restockIngredient, 
  getInventoryLogs, 
  getRecipes,
  getAllOrders,
  updateOrderStatus,
  updateRecipeItem,
  createRecipeItem,
  deleteRecipeItem
} from '@/services/api';
import { logout, useSession } from '@/services/session';

export default function AdminPage() {
  const router = useRouter();
  const sessionUser = useSession((state) => state.user);
  const [activeTab, setActiveTab] = useState<'INGREDIENTS' | 'RECIPES' | 'ORDERS' | 'LOGS'>('INGREDIENTS');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Modals state: Restock
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(1000);
  const [restockReason, setRestockReason] = useState<string>('Nhập thêm kho định kỳ');
  const [submittingRestock, setSubmittingRestock] = useState(false);

  // Modals state: Create Ingredient
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('g');
  const [newStock, setNewStock] = useState(1000);
  const [newMinThreshold, setNewMinThreshold] = useState(200);
  const [newCost, setNewCost] = useState(100);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Modals state: Edit Recipe Item
  const [editingRecipeItem, setEditingRecipeItem] = useState<{ id: string; ingredientName: string; unit: string; currentAmount: number } | null>(null);
  const [newRecipeAmount, setNewRecipeAmount] = useState<number>(0);
  const [submittingRecipeEdit, setSubmittingRecipeEdit] = useState(false);

  // Modals state: Add Recipe Item
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [targetProductForRecipe, setTargetProductForRecipe] = useState<{ id: string; name: string } | null>(null);
  const [newRecipeIngredientId, setNewRecipeIngredientId] = useState<string>('');
  const [newRecipeSize, setNewRecipeSize] = useState<string>('M');
  const [newRecipeAmountNeeded, setNewRecipeAmountNeeded] = useState<number>(20);
  const [submittingAddRecipe, setSubmittingAddRecipe] = useState(false);

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [ingData, recData, logData, ordData] = await Promise.all([
        getIngredients(),
        getRecipes(),
        getInventoryLogs(50),
        getAllOrders(),
      ]);
      setIngredients(ingData);
      setRecipes(recData);
      setLogs(logData);
      setOrders(ordData);
    } catch (err) {
      console.error('Lỗi tải dữ liệu Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const metrics = useMemo(() => {
    const totalIngredients = ingredients.length;
    const lowStockCount = ingredients.filter((i) => i.isLowStock).length;
    const totalOrdersCount = orders.length;
    const totalRevenue = orders
      .filter((o) => ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(o.status))
      .reduce((sum, o) => sum + (Number(o.finalAmount) || 0), 0);

    return { totalIngredients, lowStockCount, totalOrdersCount, totalRevenue };
  }, [ingredients, orders]);

  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return ingredients;
    const q = searchQuery.toLowerCase();
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, searchQuery]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'ALL') return orders;
    return orders.filter((o) => o.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const handleOpenRestock = (ing: any) => {
    setSelectedIngredient(ing);
    setRestockAmount(ing.unit === 'pcs' ? 100 : ing.unit === 'ml' ? 2000 : 1000);
    setShowRestockModal(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || restockAmount <= 0) return;

    setSubmittingRestock(true);
    try {
      await restockIngredient(selectedIngredient.id, Number(restockAmount), restockReason);
      setShowRestockModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể nhập hàng');
    } finally {
      setSubmittingRestock(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmittingCreate(true);
    try {
      await createIngredient({
        name: newName.trim(),
        unit: newUnit,
        stockQuantity: Number(newStock),
        minThreshold: Number(newMinThreshold),
        costPerUnit: Number(newCost),
      });
      setShowCreateModal(false);
      setNewName('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo nguyên liệu');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, 'CANCELLED');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy đơn hàng');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ── Recipe Modification Handlers ──
  const handleOpenEditRecipe = (r: any) => {
    setEditingRecipeItem({
      id: r.id,
      ingredientName: r.ingredient.name,
      unit: r.ingredient.unit,
      currentAmount: r.quantity,
    });
    setNewRecipeAmount(r.quantity);
  };

  const handleSaveRecipeAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipeItem || newRecipeAmount <= 0) return;
    setSubmittingRecipeEdit(true);
    try {
      await updateRecipeItem(editingRecipeItem.id, Number(newRecipeAmount));
      setEditingRecipeItem(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật công thức');
    } finally {
      setSubmittingRecipeEdit(false);
    }
  };

  const handleDeleteRecipeItem = async (recipeItemId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nguyên liệu này khỏi công thức?')) return;
    try {
      await deleteRecipeItem(recipeItemId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa nguyên liệu khỏi công thức');
    }
  };

  const handleOpenAddRecipe = (product: any) => {
    setTargetProductForRecipe({ id: product.id, name: product.name });
    setNewRecipeIngredientId(ingredients[0]?.id || '');
    setNewRecipeSize('M');
    setNewRecipeAmountNeeded(20);
    setShowAddRecipeModal(true);
  };

  const handleAddRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForRecipe || !newRecipeIngredientId || newRecipeAmountNeeded <= 0) return;
    setSubmittingAddRecipe(true);
    try {
      await createRecipeItem({
        productId: targetProductForRecipe.id,
        ingredientId: newRecipeIngredientId,
        amountNeeded: Number(newRecipeAmountNeeded),
        size: newRecipeSize ? (newRecipeSize as any) : undefined,
      });
      setShowAddRecipeModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể thêm nguyên liệu vào công thức');
    } finally {
      setSubmittingAddRecipe(false);
    }
  };

  const handleLogout = () => {
    const result = logout();
    if (result.success) router.push('/login');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Chờ pha (PAID)</span>;
      case 'PREPARING':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Đang pha</span>;
      case 'READY':
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Mời lấy nước</span>;
      case 'COMPLETED':
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Hoàn tất</span>;
      case 'CANCELLED':
        return <span className="bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold line-through">Đã hủy</span>;
      default:
        return <span className="bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Chờ xử lý</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-800">
      {/* ── Sticky BrewLite Header (Đúng tone khách hàng) ── */}
      <header className="sticky top-0 z-20 border-b border-orange-300/20 bg-[linear-gradient(110deg,#25150f,#482718_65%,#301b14)] px-4 py-3 text-orange-50 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200/25 bg-[linear-gradient(145deg,#b65e28,#63321d)] text-orange-100 shadow-sm">
              <Coffee size={18} />
            </div>
            <div>
              <h1 className="font-serif text-sm font-bold tracking-tight text-orange-50">
                Brew<span className="text-orange-300">Lite</span> <span className="text-xs font-sans font-normal text-orange-200/70">· Quản trị Admin</span>
              </h1>
              <p className="text-[10px] text-orange-200/60 font-medium">Kho hàng · Công thức · Đơn hàng</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200/10 bg-white/10 text-orange-100 transition-colors hover:bg-white/20"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-orange-300' : ''} />
            </button>
            <button
              onClick={handleLogout}
              aria-label="Đăng xuất"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-300/20 bg-red-950/40 text-red-200 transition-colors hover:bg-red-900/60"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* ── Profile Card Quản trị viên ── */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs text-amber-200">Tài khoản Quản lý Quán</p>
          <h2 className="text-base font-extrabold mt-0.5">{sessionUser?.email || 'admin@brewlite.vn'}</h2>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 text-xs font-bold">
            <ShieldCheck size={14} className="text-amber-300" />
            <span>Vai trò: Quản trị viên (ADMIN)</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-white/20 text-center">
            <div className="bg-black/15 rounded-xl p-2">
              <span className="text-base font-black">{metrics.totalIngredients}</span>
              <p className="text-[9px] text-amber-200">Nguyên liệu</p>
            </div>
            <div className="bg-black/15 rounded-xl p-2">
              <span className={`text-base font-black ${metrics.lowStockCount > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                {metrics.lowStockCount}
              </span>
              <p className="text-[9px] text-amber-200">Sắp hết</p>
            </div>
            <div className="bg-black/15 rounded-xl p-2">
              <span className="text-base font-black">{metrics.totalOrdersCount}</span>
              <p className="text-[9px] text-amber-200">Đơn hàng</p>
            </div>
            <div className="bg-black/15 rounded-xl p-2">
              <span className="text-base font-black text-amber-300">
                {(metrics.totalRevenue / 1000).toFixed(0)}k
              </span>
              <p className="text-[9px] text-amber-200">Doanh thu</p>
            </div>
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="grid grid-cols-4 bg-gray-200/80 p-1 rounded-2xl gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('INGREDIENTS')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'INGREDIENTS' ? 'bg-white shadow text-amber-900 font-bold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package size={14} />
            <span>Kho ({ingredients.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('RECIPES')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'RECIPES' ? 'bg-white shadow text-amber-900 font-bold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers size={14} />
            <span>Công thức ({recipes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'ORDERS' ? 'bg-white shadow text-amber-900 font-bold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Đơn hàng ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`py-2 rounded-xl transition-all flex flex-col items-center gap-0.5 ${
              activeTab === 'LOGS' ? 'bg-white shadow text-amber-900 font-bold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History size={14} />
            <span>Nhật ký</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 1: KHO NGUYÊN LIỆU (INGREDIENTS)
        ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'INGREDIENTS' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm nguyên liệu (cà phê, sữa, đường...)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span>Thêm</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredIngredients.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Package size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">Không tìm thấy nguyên liệu nào</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredIngredients.map((ing) => {
                  const stockPct = Math.min(100, Math.round((ing.stockQuantity / (ing.minThreshold * 2.5)) * 100));
                  return (
                    <div
                      key={ing.id}
                      className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:border-amber-200 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{ing.name}</span>
                            {ing.isOutOfStock ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">Hết hàng</span>
                            ) : ing.isLowStock ? (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">Sắp hết</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-medium px-2 py-0.5 rounded-md">Đủ hàng</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>Đơn vị: <b className="text-gray-700">{ing.unit}</b></span>
                            <span>•</span>
                            <span>Giá vốn: <b className="text-gray-700">{Number(ing.costPerUnit).toLocaleString('vi-VN')}đ/{ing.unit}</b></span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenRestock(ing)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 font-bold text-xs hover:bg-amber-100 transition-colors flex items-center gap-1"
                        >
                          <Plus size={13} />
                          <span>Nhập kho</span>
                        </button>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">
                            Tồn kho: <b className={`text-sm ${ing.isLowStock ? 'text-rose-600 font-extrabold' : 'text-gray-900'}`}>{ing.stockQuantity}</b> {ing.unit}
                          </span>
                          <span className="text-gray-400 text-[11px]">Tối thiểu: {ing.minThreshold} {ing.unit}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              ing.isOutOfStock
                                ? 'bg-rose-600'
                                : ing.isLowStock
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(5, stockPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 2: CÔNG THỨC PHA CHẾ (BOM - RECIPES) - HỖ TRỢ CHỈNH SỬA / THÊM / XÓA
        ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'RECIPES' && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <Layers size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Định mức nguyên liệu (Bill of Materials - BOM)</p>
                <p className="text-amber-800/80 text-[11px] mt-0.5">
                  Admin có thể trực tiếp sửa định lượng, thêm nguyên liệu hoặc gỡ nguyên liệu cho từng món. Hệ thống tự động tính lại giá vốn & tỷ lệ lãi.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recipes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Layers size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">Chưa có công thức nào được thiết lập</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recipes.map((item) => {
                  const isExpanded = expandedRecipeId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <div
                        onClick={() => setExpandedRecipeId(isExpanded ? null : item.id)}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              MÓN NƯỚC
                            </span>
                            <span className="text-sm font-bold text-gray-900">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>Giá bán: <b className="text-amber-700">{(item.price ?? 0).toLocaleString('vi-VN')}đ</b></span>
                            <span>•</span>
                            <span>Giá vốn: <b className="text-gray-700">{Math.round(item.estimatedCost ?? item.estimatedCostM ?? 0).toLocaleString('vi-VN')}đ</b></span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">Lãi: {item.profitMarginPct}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-xl">
                            {item.itemsCount} ng.liệu
                          </span>
                          {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100 bg-gray-50/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Định lượng nguyên liệu:</p>
                            <button
                              onClick={() => handleOpenAddRecipe(item)}
                              className="text-[11px] font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Plus size={12} />
                              <span>Thêm nguyên liệu</span>
                            </button>
                          </div>

                          {item.recipeItems && item.recipeItems.length > 0 ? (
                            <div className="space-y-1.5">
                              {item.recipeItems.map((r: any) => (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100 text-xs hover:border-amber-200 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-800">{r.ingredient.name}</span>
                                    {r.size ? (
                                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                        Size {r.size}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium">
                                        Tất cả size
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <span className="font-bold text-gray-900">
                                        {r.quantity} {r.ingredient.unit}
                                      </span>
                                      <span className="text-gray-400 text-[10px] block">
                                        ≈ {Math.round(Number(r.quantity) * Number(r.ingredient.costPerUnit)).toLocaleString('vi-VN')}đ
                                      </span>
                                    </div>

                                    {/* Action buttons: Edit & Delete */}
                                    <button
                                      onClick={() => handleOpenEditRecipe(r)}
                                      title="Sửa định lượng"
                                      className="p-1.5 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecipeItem(r.id)}
                                      title="Xóa nguyên liệu này khỏi công thức"
                                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-center py-4 text-xs text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                              Chưa có nguyên liệu nào. Nhấn &quot;Thêm nguyên liệu&quot; để thiết lập công thức.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 3: QUẢN LÝ ĐƠN HÀNG (ORDERS)
        ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'PAID', label: 'Chờ pha' },
                { id: 'PREPARING', label: 'Đang pha' },
                { id: 'READY', label: 'Mời lấy' },
                { id: 'COMPLETED', label: 'Hoàn tất' },
                { id: 'CANCELLED', label: 'Đã hủy' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOrderStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                    orderStatusFilter === tab.id
                      ? 'bg-amber-700 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <ShoppingBag size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">Không có đơn hàng nào trong mục này</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isUpdating = updatingOrderId === order.id;
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-gray-500">#{order.id.slice(-6).toUpperCase()}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-xs font-semibold text-gray-800 mt-1">
                            {order.user?.email || order.userEmail || 'Khách vãng lai'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-amber-700">
                            {Number(order.finalAmount || 0).toLocaleString('vi-VN')}đ
                          </span>
                          <p className="text-[10px] text-gray-400">{order.paymentMethod || 'Tiền mặt'}</p>
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="bg-gray-50/80 rounded-xl p-2.5 space-y-1.5 text-xs">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-gray-700">
                            <div>
                              <span className="font-bold text-gray-900">{item.productName || item.product?.name}</span>
                              <span className="text-amber-800 font-semibold ml-1.5 text-[11px]">Size {item.size}</span>
                              {item.toppings && item.toppings.length > 0 && (
                                <p className="text-[10px] text-gray-500 italic">
                                  + {Array.isArray(item.toppings) ? item.toppings.map((t: any) => typeof t === 'string' ? t : t.name).join(', ') : ''}
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-gray-800">x{item.qty}</span>
                          </div>
                        ))}
                      </div>

                      {/* Admin Quick Status Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          {order.status === 'PAID' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors"
                            >
                              Chuyển Đang pha
                            </button>
                          )}
                          {order.status === 'PREPARING' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, 'READY')}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                            >
                              Chuyển Mời lấy
                            </button>
                          )}
                          {order.status === 'READY' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                            >
                              Hoàn tất đơn
                            </button>
                          )}
                          {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-2.5 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                            >
                              Hủy đơn
                            </button>
                          )}
                        </div>

                        {/* Dropdown status selector for Admin override */}
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-gray-400">Đổi:</label>
                          <select
                            disabled={isUpdating}
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-semibold text-gray-700 focus:outline-none"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PAID">PAID</option>
                            <option value="PREPARING">PREPARING</option>
                            <option value="READY">READY</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 4: NHẬT KÝ KHO (LOGS)
        ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'LOGS' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center justify-between shadow-sm">
              <span className="text-xs font-bold text-gray-700">Giao dịch kho gần đây (50 lượt)</span>
              <span className="text-[10px] text-gray-400">Tự động ghi nhận khi đặt & nhập kho</span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <History size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700">Chưa có giao dịch kho nào</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => {
                  const isPositive = log.changeQuantity > 0;
                  return (
                    <div
                      key={log.id}
                      className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{log.ingredient?.name || 'Nguyên liệu'}</p>
                          <p className="text-[10px] text-gray-500">{log.reason || 'Cập nhật kho'}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-black text-sm ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? `+${log.changeQuantity}` : log.changeQuantity} {log.ingredient?.unit}
                        </span>
                        <p className="text-[10px] text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal Sửa Định Lượng Nguyên Liệu Trong Công Thức ── */}
      {editingRecipeItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Sửa Định Lượng Công Thức</h3>
                <p className="text-xs text-amber-700 font-semibold">{editingRecipeItem.ingredientName}</p>
              </div>
              <button
                onClick={() => setEditingRecipeItem(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecipeAmount} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Định lượng cần dùng ({editingRecipeItem.unit})
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={newRecipeAmount}
                  onChange={(e) => setNewRecipeAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Định lượng hiện tại: {editingRecipeItem.currentAmount} {editingRecipeItem.unit}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecipeItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingRecipeEdit}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  {submittingRecipeEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Thêm Nguyên Liệu Mới Vào Công Thức ── */}
      {showAddRecipeModal && targetProductForRecipe && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Thêm Nguyên Liệu Vào Món</h3>
                <p className="text-xs text-amber-700 font-semibold">{targetProductForRecipe.name}</p>
              </div>
              <button
                onClick={() => setShowAddRecipeModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRecipeSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Chọn nguyên liệu</label>
                <select
                  value={newRecipeIngredientId}
                  onChange={(e) => setNewRecipeIngredientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit}) — Tồn: {ing.stockQuantity} {ing.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Áp dụng cho Size</label>
                <select
                  value={newRecipeSize}
                  onChange={(e) => setNewRecipeSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Tất cả các size</option>
                  <option value="S">Size S (Nhỏ)</option>
                  <option value="M">Size M (Vừa)</option>
                  <option value="L">Size L (Lớn)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Định lượng cần dùng</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  placeholder="Ví dụ: 25..."
                  value={newRecipeAmountNeeded}
                  onChange={(e) => setNewRecipeAmountNeeded(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRecipeModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAddRecipe}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  {submittingAddRecipe ? 'Đang thêm...' : 'Thêm vào công thức'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Nhập Kho ── */}
      {showRestockModal && selectedIngredient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Nhập Thêm Nguyên Liệu</h3>
                <p className="text-xs text-amber-700 font-semibold">{selectedIngredient.name}</p>
              </div>
              <button
                onClick={() => setShowRestockModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Số lượng nhập thêm ({selectedIngredient.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Tồn kho hiện tại: {selectedIngredient.stockQuantity} {selectedIngredient.unit}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                  Lý do / Ghi chú nhập hàng
                </label>
                <input
                  type="text"
                  required
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingRestock}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  {submittingRestock ? 'Đang lưu...' : 'Xác nhận nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Tạo Mới Nguyên Liệu ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Thêm Nguyên Liệu Mới</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Tên nguyên liệu</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cà phê Robusta..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Đơn vị tính</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="g">gram (g)</option>
                    <option value="ml">mililít (ml)</option>
                    <option value="pcs">cái / gói (pcs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Giá vốn / Đơn vị</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Số lượng ban đầu</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Ngưỡng báo động</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMinThreshold}
                    onChange={(e) => setNewMinThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  {submittingCreate ? 'Đang tạo...' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
