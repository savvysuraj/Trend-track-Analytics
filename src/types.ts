export interface Sale {
  orderNumber: string;
  product: string;
  price: number;
  date: string;
  paymentMethod: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  uniqueProducts: number;
}
