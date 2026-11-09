export const orderLabels = {
  PENDING: 'Đơn đang chờ thanh toán',
  PAID: 'Đã xác nhận thanh toán mô phỏng',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  PREPARING: 'Đơn đang được chuẩn bị',
  READY: 'Đơn đã sẵn sàng',
  COMPLETED: 'Đơn đã hoàn tất',
  CANCELLED: 'Đơn đã hủy',
} as const;

export type ConfirmedOrder = {
  id: string;
  status: keyof typeof orderLabels;
  finalAmount: number;
  items: { id: string; productName: string; qty: number; size: string; lineTotal: number; toppings: string[] }[];
};

export function readOrder(value: unknown, expectedId: string): ConfirmedOrder {
  if (!value || typeof value !== 'object') throw new Error('Không xác minh được dữ liệu đơn hàng.');
  const order = value as Record<string, unknown>;
  if (
    order.id !== expectedId ||
    typeof order.status !== 'string' ||
    !Object.hasOwn(orderLabels, order.status) ||
    typeof order.finalAmount !== 'number' ||
    !Number.isFinite(order.finalAmount) ||
    order.finalAmount < 0 ||
    !Array.isArray(order.items)
  ) {
    throw new Error('Không xác minh được dữ liệu hoặc trạng thái đơn hàng.');
  }

  const items: ConfirmedOrder['items'] = order.items.map((item: unknown) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Không xác minh được dữ liệu hoặc trạng thái đơn hàng.');
    }
    const row = item as Record<string, unknown>;
    const id = row.id;
    const productName = row.productName;
    const qty = row.qty;
    const size = row.size;
    const lineTotal = row.lineTotal;
    const rawToppings = row.toppings;

    const validBasic =
      typeof id === 'string' &&
      typeof productName === 'string' &&
      typeof qty === 'number' &&
      Number.isInteger(qty) &&
      qty > 0 &&
      typeof size === 'string' &&
      typeof lineTotal === 'number' &&
      Number.isFinite(lineTotal) &&
      lineTotal >= 0 &&
      Array.isArray(rawToppings);

    if (!validBasic) {
      throw new Error('Không xác minh được dữ liệu hoặc trạng thái đơn hàng.');
    }

    const toppings: string[] = rawToppings.map((topping: unknown) => {
      if (typeof topping === 'string') return topping;
      if (
        topping &&
        typeof topping === 'object' &&
        'name' in topping &&
        typeof (topping as Record<string, unknown>).name === 'string'
      ) {
        return (topping as Record<string, unknown>).name as string;
      }
      throw new Error('Không xác minh được dữ liệu hoặc trạng thái đơn hàng.');
    });

    return {
      id,
      productName,
      qty,
      size,
      lineTotal,
      toppings,
    };
  });

  return {
    id: order.id,
    status: order.status as keyof typeof orderLabels,
    finalAmount: order.finalAmount,
    items,
  };
}
