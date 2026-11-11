export type Role = "admin" | "staff";

export type ProductLocation = "fridge" | "shelf";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type StockMovementType =
  | "restock"
  | "sale"
  | "adjustment"
  | "waste"
  | "void";

export type SaleStatus = "completed" | "voided";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
  product_count?: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  color: string | null;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category_id: string;
  category?: ProductCategory;
  package: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  location: ProductLocation;
  slot_code: string | null;
  is_active: boolean;
  margin: number;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
}

export interface Purchase {
  id: string;
  reference: string;
  supplier_id: string;
  supplier?: Pick<Supplier, "id" | "name">;
  purchased_at: string;
  total_quantity: number;
  total_cost: number;
  notes: string | null;
  created_by_name: string;
  items: PurchaseItem[];
}

export interface SaleItem {
  id?: string;
  product_id: string;
  product_code: string;
  product_name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
  line_total: number;
  line_profit: number;
}

export interface Sale {
  id: string;
  reference: string;
  subtotal: number;
  discount: number;
  total: number;
  status: SaleStatus;
  sold_by_name: string;
  notes: string | null;
  created_at: string;
  items: SaleItem[];
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  type: StockMovementType;
  quantity_delta: number;
  unit_cost: number | null;
  reference: string | null;
  note: string | null;
  created_by_name: string;
  created_at: string;
}

export interface LowStockItem {
  product_id: string;
  name: string;
  code: string;
  stock_qty: number;
  threshold: number;
  status: StockStatus;
  slot_code: string | null;
  category: string;
}

export interface ProductStockRow extends Product {
  units_sold: number;
  revenue: number;
  profit: number;
  retail_value: number;
  cost_value: number;
}

export interface CategoryMixItem {
  category: string;
  revenue: number;
  units: number;
  percent: number;
  color: string;
}

export interface TopProduct {
  product_id: string;
  name: string;
  code: string;
  units_sold: number;
  revenue: number;
  profit: number;
}

export interface StockSummary {
  month: string;
  product_count: number;
  total_units: number;
  inventory_value: number;
  retail_value: number;
  units_sold: number;
  revenue: number;
  gross_profit: number;
  low_stock_count: number;
  out_of_stock_count: number;
  category_mix: CategoryMixItem[];
  top_products: TopProduct[];
  alerts: LowStockItem[];
  items: ProductStockRow[];
}

export interface MonthlyStock {
  month: string;
  units_sold: number;
  revenue: number;
  profit: number;
  closing_units: number;
}

export interface DailyClose {
  id: string;
  business_date: string;
  aba_sales: number;
  total_sales: number;
  gross_profit: number;
  expenses: number;
  variance: number | null;
  aba_balance: number | null;
  notes: string | null;
  closed_by_name: string;
  closed_at: string;
}

export interface DailyClosePreview {
  business_date: string;
  aba_sales: number;
  total_sales: number;
  gross_profit: number;
  expenses: number;
  variance: number | null;
  aba_balance: number | null;
  existing_close: DailyClose | null;
}

export interface DashboardPeriodStats {
  revenue: number;
  gross_profit: number;
  units_sold: number;
  sales_count: number;
}

export interface DashboardSummary {
  today: DashboardPeriodStats;
  yesterday: DashboardPeriodStats;
  revenue_change_pct: number;
  profit_change_pct: number;
  units_change_pct: number;
  profit_margin_pct: number;
  low_stock_count: number;
  out_of_stock_count: number;
  active_products: number;
  inventory_value: number;
  aba_total: number;
  daily_close_done: boolean;
}

export interface SalesTrendPoint {
  date: string;
  revenue: number;
  profit: number;
  units: number;
  sales: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  actor: string;
  created_at: string;
}

export interface StaffPerformance {
  user_id: string;
  name: string;
  sales_count: number;
  revenue: number;
  units: number;
}

export interface ReportSalesPoint {
  period: string;
  revenue: number;
  profit: number;
  units: number;
  sales: number;
}

export interface Settings {
  store_name: string;
  dorm_name: string;
  currency: string;
  low_stock_default: number;
  receipt_footer: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface LoginResponse {
  user: User;
}

export interface ProductListParams {
  q?: string;
  category_id?: string;
  status?: StockStatus;
  location?: ProductLocation;
  page?: number;
  page_size?: number;
  sort?: string;
}

export interface SaleListParams {
  q?: string;
  status?: SaleStatus;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export interface PurchaseListParams {
  supplier_id?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

export interface CreateSalePayload {
  items: Array<{ product_id: string; quantity: number }>;
  discount?: number;
  notes?: string;
}

export interface CreatePurchasePayload {
  supplier_id: string;
  purchased_at: string;
  notes?: string;
  items: Array<{ product_id: string; quantity: number; unit_cost: number }>;
}

export interface AdjustStockPayload {
  type: "restock" | "adjustment" | "waste";
  quantity: number;
  note?: string;
}

export interface ProductPayload {
  code: string;
  name: string;
  category_id: string;
  package: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  location: ProductLocation;
  slot_code?: string | null;
  is_active?: boolean;
}

export interface DailyClosePayload {
  business_date: string;
  aba_balance: number;
  expenses: number;
  notes?: string;
}
