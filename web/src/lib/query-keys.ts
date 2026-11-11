export const queryKeys = {
  me: ["me"] as const,
  dashboard: {
    all: ["dashboard"] as const,
    summary: ["dashboard", "summary"] as const,
    trend: (days: number) => ["dashboard", "trend", days] as const,
    categoryMix: (days: number) => ["dashboard", "category-mix", days] as const,
    topProducts: (days: number, limit: number) =>
      ["dashboard", "top-products", days, limit] as const,
    activity: (limit: number) => ["dashboard", "activity", limit] as const,
  },
  products: {
    all: ["products"] as const,
    list: (params: object) => ["products", "list", params] as const,
    detail: (id: string) => ["products", "detail", id] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  suppliers: {
    all: ["suppliers"] as const,
    list: (params: object) => ["suppliers", "list", params] as const,
  },
  purchases: {
    all: ["purchases"] as const,
    list: (params: object) => ["purchases", "list", params] as const,
    detail: (id: string) => ["purchases", "detail", id] as const,
  },
  sales: {
    all: ["sales"] as const,
    list: (params: object) => ["sales", "list", params] as const,
    detail: (id: string) => ["sales", "detail", id] as const,
  },
  stock: {
    all: ["stock"] as const,
    summary: (month: string) => ["stock", "summary", month] as const,
    alerts: ["stock", "alerts"] as const,
    movements: (params: object) =>
      ["stock", "movements", params] as const,
    monthly: (months: number) => ["stock", "monthly", months] as const,
  },
  dailyClose: {
    all: ["daily-close"] as const,
    today: ["daily-close", "today"] as const,
    list: (params: object) => ["daily-close", "list", params] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    sales: (params: object) => ["analytics", "sales", params] as const,
    staff: (params: object) => ["analytics", "staff", params] as const,
  },
  settings: {
    all: ["settings"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params: object) => ["users", "list", params] as const,
  },
};
