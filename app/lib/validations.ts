import { z } from "zod";

// User schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum([
    "SJFS_ADMIN",
    "MERCHANT_ADMIN",
    "MERCHANT_STAFF",
    "WAREHOUSE_STAFF",
  ]),
  merchantId: z.string().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z
    .enum(["SJFS_ADMIN", "MERCHANT_ADMIN", "MERCHANT_STAFF", "WAREHOUSE_STAFF"])
    .optional(),
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Merchant schemas
export const createMerchantSchema = z.object({
  businessName: z.string().min(1),
  businessEmail: z.string().email(),
  businessPhone: z.string().min(1),
  contactPerson: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().default("Nigeria"),
  cacNumber: z.string().optional(),
  taxId: z.string().optional(),
});

export const updateMerchantSchema = z.object({
  businessName: z.string().min(1).optional(),
  businessEmail: z.string().email().optional(),
  businessPhone: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().optional(),
  cacNumber: z.string().optional(),
  taxId: z.string().optional(),
  isActive: z.boolean().optional(),
  onboardingStatus: z
    .enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"])
    .optional(),
});

// Product schemas
export const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  unitPrice: z.number().positive().optional(),
  hasExpiry: z.boolean().default(false),
  isPerishable: z.boolean().default(false),
  barcodeData: z.string().optional(),
  images: z.array(z.string().min(1)).default([]),
});

export const updateProductSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .nullable()
    .optional(),
  unitPrice: z.number().positive().nullable().optional(),
  hasExpiry: z.boolean().optional(),
  isPerishable: z.boolean().optional(),
  barcodeData: z.string().nullable().optional(),
  images: z.array(z.string().min(1)).optional(),
});

// Order schemas
export const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(1),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().default("Nigeria"),
    postalCode: z.string().optional(),
  }),
  orderValue: z.number().positive(),
  deliveryFee: z.number().min(0).default(0),
  paymentMethod: z.enum(["COD", "PREPAID", "WALLET"]).default("COD"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
      })
    )
    .min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PICKED",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "RETURNED",
    "CANCELLED",
  ]),
  notes: z.string().optional(),
  trackingNumber: z.string().optional(),
  expectedDelivery: z.string().datetime().optional(),
});

// Warehouse schemas
export const createWarehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().default("Nigeria"),
  capacity: z.number().positive().optional(),
  managerId: z.string().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

// Stock schemas
export const createStockItemSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).default(10),
  maxStockLevel: z.number().int().positive().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  location: z.string().optional(),
  costPrice: z.number().positive().optional(),
});

export const updateStockItemSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().positive().optional(),
  location: z.string().optional(),
  costPrice: z.number().positive().optional(),
});

// Subscription schemas
export const createSubscriptionSchema = z.object({
  merchantId: z.string(),
  servicePlanId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  addons: z
    .array(
      z.object({
        addonServiceId: z.string(),
        quantity: z.number().int().positive().default(1),
      })
    )
    .default([]),
});

export const updateSubscriptionSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"]).optional(),
  endDate: z.string().datetime().optional(),
});

// Logistics Partner schemas
export const createLogisticsPartnerSchema = z.object({
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  cacNumber: z.string().min(1),
  coverageAreas: z.array(z.string()).min(1),
  password: z.string().min(8),
  guarantors: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    relationship: z.string(),
  }),
  documents: z
    .object({
      cacCertificate: z.string().url().optional(),
      insuranceCertificate: z.string().url().optional(),
      bankStatement: z.string().url().optional(),
    })
    .optional(),
});

export const updateLogisticsPartnerSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  coverageAreas: z.array(z.string()).min(1).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
});

// Return schemas
export const createReturnSchema = z.object({
  orderId: z.string(),
  reason: z.enum([
    "DAMAGED",
    "WRONG_ITEM",
    "CUSTOMER_REJECTED",
    "NO_MONEY",
    "QUALITY_ISSUE",
    "OTHER",
  ]),
  description: z.string().optional(),
  refundAmount: z.number().positive().optional(),
  restockable: z.boolean().default(false),
});

export const updateReturnSchema = z.object({
  status: z
    .enum(["PENDING", "APPROVED", "REJECTED", "PROCESSED", "RESTOCKED"])
    .optional(),
  refundAmount: z.number().positive().optional(),
  approvedAmount: z.number().positive().optional(),
  rejectionReason: z.string().optional(),
  restockable: z.boolean().optional(),
});

// Warehouse Zone Schemas
export const createWarehouseZoneSchema = z.object({
  name: z.string().min(1, "Zone name is required").max(100),
  code: z.string().min(1, "Zone code is required").max(20),
  description: z.string().optional(),
  capacity: z.number().positive("Capacity must be positive"),
  isActive: z.boolean().default(true),
});

export const updateWarehouseZoneSchema = z.object({
  name: z.string().min(1, "Zone name is required").max(100).optional(),
  code: z.string().min(1, "Zone code is required").max(20).optional(),
  description: z.string().optional(),
  capacity: z.number().positive("Capacity must be positive").optional(),
  isActive: z.boolean().optional(),
});
