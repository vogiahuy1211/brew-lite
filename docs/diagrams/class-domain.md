# Class Diagram — Domain Model BrewLite

> **Mức độ:** Domain / Business Layer  
> **Công cụ:** Mermaid  
> **Căn cứ:** `apps/api/prisma/schema.prisma` (Khớp 100% CSDL 12 bảng)  
> **Cập nhật:** 2026-11-14

## Sơ đồ

```mermaid
classDiagram
    direction TB

    %% ══════════════════════════════════════
    %% ENUMS
    %% ══════════════════════════════════════
    class UserRole {
        <<enumeration>>
        CUSTOMER
        STAFF
        ADMIN
    }

    class OrderStatus {
        <<enumeration>>
        PENDING
        PAID
        PAYMENT_FAILED
        PREPARING
        READY
        COMPLETED
        CANCELLED
    }

    class PaymentMethod {
        <<enumeration>>
        WALLET
        CARD
    }

    class PaymentStatus {
        <<enumeration>>
        SUCCESS
        FAILED
    }

    class ItemSize {
        <<enumeration>>
        S
        M
        L
    }

    %% ══════════════════════════════════════
    %% USER & CART DOMAIN
    %% ══════════════════════════════════════
    class Users {
        +UUID id
        +String email
        +String password_hash
        +Int loyalty_points
        +UserRole role
        +register(email, password) Users
        +login(email, password) String
        +addLoyaltyPoints(amount) void
    }

    class Carts {
        +UUID id
        +UUID user_id
        +DateTime created_at
        +DateTime updated_at
        +syncWithGuest(items) void
        +clear() void
    }

    class CartItems {
        +UUID id
        +UUID cart_id
        +UUID product_id
        +ItemSize size
        +String topping_signature
        +Int quantity
        +updateQuantity(qty) void
    }

    class CartItemToppings {
        +UUID cart_item_id
        +UUID topping_id
    }

    %% ══════════════════════════════════════
    %% PRODUCT & BOM INVENTORY DOMAIN
    %% ══════════════════════════════════════
    class Products {
        +UUID id
        +String name
        +Decimal price
        +String image_url
        +Int stock
        +Int version
        +isAvailable(qty) Boolean
        +calculateAvailableStock() Int
        +decreaseStock(qty, version) void
    }

    class Toppings {
        +UUID id
        +String name
        +Decimal price
    }

    class Ingredients {
        +UUID id
        +String name
        +String unit
        +Decimal stock_quantity
        +Decimal min_threshold
        +Decimal cost_per_unit
        +restock(amount) void
        +isLowStock() Boolean
    }

    class RecipeItems {
        +UUID id
        +UUID product_id
        +ItemSize size
        +UUID topping_id
        +UUID ingredient_id
        +Decimal amount_needed
    }

    class InventoryLogs {
        +UUID id
        +UUID ingredient_id
        +Decimal change_amount
        +Decimal balance_after
        +String reason
        +UUID order_id
        +DateTime created_at
    }

    %% ══════════════════════════════════════
    %% ORDER & PAYMENT DOMAIN
    %% ══════════════════════════════════════
    class Promotions {
        +UUID id
        +String code
        +Decimal discount_amount
        +Boolean is_active
        +DateTime start_at
        +DateTime end_at
        +isValid() Boolean
        +apply(subtotal) Decimal
    }

    class Orders {
        +UUID id
        +UUID user_id
        +UUID promo_id
        +OrderStatus status
        +Decimal subtotal
        +Decimal discount_amount
        +Decimal final_amount
        +DateTime created_at
        +create(userId, items, promoCode) Orders
        +updateStatus(nextStatus) void
        +cancel() void
    }

    class OrderItems {
        +UUID id
        +UUID order_id
        +UUID product_id
        +ItemSize size
        +Int qty
        +Decimal unit_price
        +Decimal line_total
        +calculateLineTotal() Decimal
    }

    class OrderItemToppings {
        +UUID order_item_id
        +UUID topping_id
        +Decimal price_at_purchase
    }

    class Payments {
        +UUID id
        +UUID order_id
        +String idempotency_key
        +Decimal amount
        +PaymentMethod method
        +PaymentStatus status
        +isDuplicate(key) Boolean
    }

    %% ══════════════════════════════════════
    %% DOMAIN SERVICES
    %% ══════════════════════════════════════
    class OrderStateMachine {
        <<service>>
        +assertTransition(from OrderStatus, to OrderStatus) void
        +canTransition(from OrderStatus, to OrderStatus) Boolean
    }

    class InventoryService {
        <<service>>
        +deductOrderIngredients(tx, orderId) void
        +calculateAvailableStock(product) Int
    }

    class MockPaymentService {
        <<service>>
        +processPayment(amount, method) PaymentResult
    }

    %% ══════════════════════════════════════
    %% RELATIONSHIPS
    %% ══════════════════════════════════════

    %% User & Cart
    Users "1" -- "0..1" Carts : owns
    Users --> UserRole : role
    Carts "1" *-- "0..*" CartItems : contains
    CartItems "0..*" --> "1" Products : references
    CartItems "1" *-- "0..*" CartItemToppings : has
    CartItemToppings "0..*" --> "1" Toppings : references
    CartItems --> ItemSize : size

    %% User & Orders
    Users "1" --> "0..*" Orders : places
    Promotions "0..1" --> "0..*" Orders : applies to
    Orders "1" *-- "1..*" OrderItems : contains
    OrderItems "0..*" --> "1" Products : references
    OrderItems "1" *-- "0..*" OrderItemToppings : has
    OrderItemToppings "0..*" --> "1" Toppings : references
    Orders "1" *-- "0..*" Payments : paid by
    Orders --> OrderStatus : status
    Payments --> PaymentMethod : method
    Payments --> PaymentStatus : status
    OrderItems --> ItemSize : size

    %% Recipe & Inventory (BOM)
    Products "1" -- "0..*" RecipeItems : defined by
    Toppings "1" -- "0..*" RecipeItems : defined by
    Ingredients "1" -- "0..*" RecipeItems : used in
    RecipeItems --> ItemSize : size
    Ingredients "1" -- "0..*" InventoryLogs : logged in
    Orders "0..1" -- "0..*" InventoryLogs : triggers

    %% Domain Services associations
    OrderStateMachine ..> OrderStatus : validates
    OrderStateMachine ..> Orders : controls
    InventoryService ..> Ingredients : deducts
    InventoryService ..> RecipeItems : checks
    MockPaymentService ..> Payments : creates
```

## Mô tả Chi tiết các Lớp

### 1. Phân hệ Người dùng & Giỏ hàng (User & Cart Domain)

| Lớp | Vai trò | Ghi chú quan trọng |
|---|---|---|
| `Users` | Tài khoản người dùng | `password_hash` băm bcrypt; `loyalty_points` tích lũy tự động; `role` phân quyền (CUSTOMER, STAFF, ADMIN). |
| `Carts` | Giỏ hàng lưu trữ Database | Mỗi người dùng có tối đa 1 giỏ hàng active gắn với `user_id`. Tự động đồng bộ từ Guest Cart khi đăng nhập. |
| `CartItems` | Dòng sản phẩm trong giỏ hàng | Lưu `product_id`, `size`, `quantity` và `topping_signature` để nhóm sản phẩm cùng tùy chọn. |
| `CartItemToppings` | Topping được chọn trong giỏ hàng | Bảng liên kết nhiều-nhiều giữa `CartItems` và `Toppings`. |

### 2. Phân hệ Thực đơn & Định mức Kho (Product & BOM Inventory Domain)

| Lớp | Vai trò | Ghi chú quan trọng |
|---|---|---|
| `Products` | Sản phẩm trong menu | Quản lý `price`, `stock` và `version` (Optimistic Locking); tính toán số ly pha chế tối đa dựa trên định mức BOM. |
| `Toppings` | Topping thêm vào đồ uống | Có giá độc lập và định mức công thức pha chế riêng. |
| `Ingredients` | Nguyên liệu thô trong kho | Theo dõi tồn kho (`stock_quantity`), đơn vị đo lường (`unit`), ngưỡng cảnh báo (`min_threshold`). |
| `RecipeItems` | Định mức công thức (BOM) | Quy định lượng nguyên liệu (`amount_needed`) cấu thành nên từng món nước theo Size (S/M/L) hoặc Topping. |
| `InventoryLogs` | Nhật ký biến động kho | Lưu vết mọi lần trừ kho (khi pha chế đơn hàng `PREPARING`) hoặc nhập thêm nguyên liệu (`RESTOCK`). |

### 3. Phân hệ Đơn hàng & Thanh toán (Order & Payment Domain)

| Lớp | Vai trò | Ghi chú quan trọng |
|---|---|---|
| `Orders` | Đơn hàng của khách hàng | Trạng thái chuyển đổi qua Finite State Machine (`PENDING` $\to$ `PAID` $\to$ `PREPARING` $\to$ `READY` $\to$ `COMPLETED`). |
| `OrderItems` | Dòng món trong đơn hàng | Lưu `unit_price` và `line_total` snapshot tại thời điểm đặt đơn. |
| `OrderItemToppings` | Topping chọn trong dòng món | Lưu `price_at_purchase` snapshot để bảo đảm tính toàn vẹn tài chính. |
| `Payments` | Giao dịch thanh toán | Chứa `idempotency_key` duy nhất để ngăn ngừa double-spending (trừ tiền 2 lần). |
| `Promotions` | Mã ưu đãi giảm giá | Xác thực điều kiện kích hoạt, thời hạn hiệu lực và khấu trừ giảm giá vào đơn hàng. |

### 4. Lớp Dịch vụ Miền (Domain Services)

| Lớp | Vai trò | Phương thức chính |
|---|---|---|
| `OrderStateMachine` | Kiểm soát vòng đời đơn hàng | `assertTransition(from, to)` — ngăn chặn chuyển trạng thái phi logic. |
| `InventoryService` | Xử lý kho theo công thức BOM | `deductOrderIngredients(tx, orderId)` — trừ kho nguyên liệu tự động trong Database Transaction. |
| `MockPaymentService` | Xử lý thanh toán Idempotent | `processPayment(amount, method)` — hỗ trợ thanh toán ví/thẻ và tích hợp VNPay Sandbox. |
