-- ============================================================
-- Migration: Add Persistent Shopping Cart Tables
-- Tables: Carts, CartItems, CartItemToppings
-- ============================================================

CREATE TABLE IF NOT EXISTS public."Carts" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "Carts_pkey" PRIMARY KEY (id),
    CONSTRAINT "uq_carts_user_id" UNIQUE (user_id),
    CONSTRAINT "fk_carts_user" FOREIGN KEY (user_id) REFERENCES public."Users"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS public."CartItems" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid NOT NULL,
    size public.item_size DEFAULT 'M'::public.item_size NOT NULL,
    topping_signature character varying(500) DEFAULT ''::character varying NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "CartItems_pkey" PRIMARY KEY (id),
    CONSTRAINT "chk_cartitems_quantity_positive" CHECK (quantity > 0),
    CONSTRAINT "uq_cartitems_variant" UNIQUE (cart_id, product_id, size, topping_signature),
    CONSTRAINT "fk_cartitems_cart" FOREIGN KEY (cart_id) REFERENCES public."Carts"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "fk_cartitems_product" FOREIGN KEY (product_id) REFERENCES public."Products"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS public."CartItemToppings" (
    cart_item_id uuid NOT NULL,
    topping_id uuid NOT NULL,
    CONSTRAINT "CartItemToppings_pkey" PRIMARY KEY (cart_item_id, topping_id),
    CONSTRAINT "fk_cit_item" FOREIGN KEY (cart_item_id) REFERENCES public."CartItems"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "fk_cit_topping" FOREIGN KEY (topping_id) REFERENCES public."Toppings"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_cartitems_cart_id" ON public."CartItems"(cart_id);
CREATE INDEX IF NOT EXISTS "idx_cartitems_product_id" ON public."CartItems"(product_id);
