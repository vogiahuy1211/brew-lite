# Activity Diagram — Luồng Đặt và Thanh toán (End-to-End)

> **Use-Case:** UC-07 — Checkout & Order Fulfillment  
> **Công cụ:** Mermaid  
> **Cập nhật:** 2026-11-14

## Sơ đồ

```mermaid
flowchart TD
    START([Bắt đầu]) --> A1

    subgraph USER["Khách hàng"]
        A1[Mở ứng dụng BrewLite]
        A4[Chọn sản phẩm\nsize + topping]
        A6[Xem Giỏ hàng\nKiểm tra tổng tiền]
        A8{Đã đăng nhập?}
        A9[Đăng nhập / Đăng ký]
        A11[Chọn phương thức\nVí / Thẻ / VNPay]
        A12[Nhấn Xác nhận thanh toán]
        A_RETRY{Thử lại?}
        A_END_FAIL([Hủy đơn])
        A_WAIT[Chờ nhận thông báo pha chế]
        A_END_OK([Nhận đồ uống tại quầy])
    end

    subgraph FRONTEND["Frontend - Next.js App Router"]
        B1[Gọi GET /products\nHiển thị Menu]
        B2{Tải thành công?}
        B3[Hiển thị Skeleton Loading]
        B4[Hiển thị lưới sản phẩm & Tồn kho BOM]
        B_ERR[Hiển thị thông báo lỗi]
        B5[Lưu giỏ hàng DB / Zustand Cart]
        B6[Tính tổng tiền & Áp mã giảm giá]
        B10[Sinh Idempotency-Key UUID v4]
        B11[Gọi POST /orders\nLấy items từ Giỏ hàng DB]
        B13[Gọi POST /payments + Idempotency-Key]
        B_CONFIRM[Hiển thị màn hình Xác nhận\nMã đơn + Trạng thái PAID]
        B_FAIL[Hiển thị thông báo\nThanh toán thất bại]
    end

    subgraph BACKEND["Backend - NestJS API"]
        C1[Xác thực JWT Guard]
        C2[Validate payload\nclass-validator]
        C3{Payload hợp lệ?}
        C4[Mở DB Transaction\nKiểm tra tồn kho\nOptimistic Lock]
        C5{Tồn kho đủ?}
        C6[Tạo Orders PENDING\nTrừ stock + tăng version\nCommit Transaction]
        C7[Kiểm tra Idempotency-Key]
        C8{Key đã tồn tại?}
        C9[Xử lý thanh toán VNPay / Mock]
        C10{Thanh toán thành công?}
        C11[Cập nhật PAID\nCộng loyalty_points]
        C12[Cập nhật PAYMENT_FAILED]
        C_DUP[Trả lại kết quả giao dịch cũ]
        C_STOCK_ERR[Rollback Transaction\nTrả 409 Conflict]
        C_BOM[Thực thi Transaction:\nTrừ nguyên liệu kho BOM\nGhi InventoryLogs]
    end

    subgraph BARISTA["Barista / Pha chế (KDS Dashboard)"]
        E1[Tiếp nhận đơn hàng PAID\ntrên màn hình pha chế]
        E2[Chuyển trạng thái PREPARING]
        E3[Hoàn tất pha chế\nChuyển trạng thái READY]
        E4[Giao nước cho khách\nChuyển COMPLETED]
    end

    subgraph DB["PostgreSQL Database"]
        D1[(Lưu Orders + OrderItems)]
        D2[(Lưu Payments SUCCESS/FAILED)]
        D3[(Cập nhật Users.loyalty_points)]
        D4[(Trừ Ingredients.stock_quantity\nLưu InventoryLogs)]
    end

    %% Flow connections
    A1 --> B1
    B1 --> B3 --> B2
    B2 -->|Thành công| B4
    B2 -->|Thất bại| B_ERR
    B4 --> A4
    A4 --> B5 --> B6 --> A6
    A6 --> A8
    A8 -->|Chưa| A9 --> A8
    A8 -->|Đã đăng nhập| A11 --> A12
    A12 --> B10 --> B11
    B11 --> C1 --> C2 --> C3
    C3 -->|Không hợp lệ| B_ERR
    C3 -->|Hợp lệ| C4 --> C5
    C5 -->|Không đủ| C_STOCK_ERR --> B_ERR
    C5 -->|Đủ| C6 --> D1 --> B13
    B13 --> C7 --> C8
    C8 -->|Đã tồn tại| C_DUP
    C8 -->|Lần đầu| C9 --> C10
    C10 -->|Thành công| C11 --> D2 --> D3 --> B_CONFIRM
    C10 -->|Thất bại| C12 --> D2 --> B_FAIL
    C_DUP --> B_CONFIRM
    B_FAIL --> A_RETRY
    A_RETRY -->|Có| B10
    A_RETRY -->|Không| A_END_FAIL

    %% Barista Fulfillment flow
    B_CONFIRM --> A_WAIT
    B_CONFIRM --> E1
    E1 --> E2 --> C_BOM --> D4 --> E3 --> E4 --> A_END_OK
```

## Ghi chú các Phân vùng (Swimlanes)

| Swimlane | Thành phần | Trách nhiệm chính |
|---|---|---|
| `USER` | Khách hàng | Duyệt thực đơn, chọn Size/Topping, thêm giỏ, thanh toán và nhận đồ uống tại quầy. |
| `FRONTEND` | Next.js App Router | Giao diện PWA, đồng bộ giỏ hàng với Database, sinh Idempotency-Key và hiển thị tiến độ. |
| `BACKEND` | NestJS API | Bảo vệ JWT Guard, kiểm soát State Machine, khóa Optimistic Lock và trừ kho BOM trong Transaction. |
| `BARISTA` | Màn hình KDS | Tiếp nhận đơn `PAID`, chuyển `PREPARING` để pha chế và `READY` khi hoàn tất. |
| `DB` | PostgreSQL | Lưu trữ bền vững dữ liệu Đơn hàng, Thanh toán, Điểm thưởng và Nhật ký kho (`InventoryLogs`). |

## Các nhánh Ngoại lệ được thể hiện

1. **API lỗi khi tải menu** $\rightarrow$ Hiển thị thông báo lỗi, không crash app.
2. **Chưa đăng nhập** $\rightarrow$ Chuyển hướng đăng nhập, tự động đồng bộ giỏ hàng DB.
3. **Payload không hợp lệ** $\rightarrow$ Trả 400 Bad Request, hiển thị thông báo validation chi tiết.
4. **Hết hàng hoặc xung đột phiên bản (Optimistic Lock thất bại)** $\rightarrow$ Rollback transaction, trả 409 Conflict.
5. **Thanh toán thất bại** $\rightarrow$ Chuyển đơn sang `PAYMENT_FAILED`, giữ nguyên giỏ hàng cho phép khách hàng Retry với phương thức khác.
6. **Retry trùng lặp (same Idempotency-Key)** $\rightarrow$ Trả kết quả giao dịch cũ, ngăn chặn trừ tiền 2 lần.
