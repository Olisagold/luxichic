import type { RangeKey } from '@/lib/utils/adminAnalytics';

/** A date range in Lagos calendar days, both ends included (YYYY-MM-DD). */
export interface Period {
  key: RangeKey;
  from: string;
  to: string;
}

export interface SeriesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface ProductSales {
  /** Null when the product has since been deleted. */
  productId: string | null;
  name: string;
  image: string;
  qty: number;
  revenue: number;
}

export interface DivisionSlice {
  name: string;
  value: number;
  color: string;
}

export interface DashboardData {
  period: Period;
  revenue: number;
  revenueChange: number | null;
  orderCount: number;
  ordersChange: number | null;
  series: SeriesPoint[];
  division: DivisionSlice[];
  top: ProductSales[];
  awaiting: { count: number; total: number };
  confirmed: { count: number; revenue: number };
  pendingOrders: number;
  lowStock: { count: number; items: { id: string; name: string; image: string; stock: number }[] };
  todayAppointments: {
    reference: string;
    time: string;
    serviceName: string;
    customerName: string;
    specialistName: string | null;
    status: string;
  }[];
  pendingAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  appointmentsByStatus: { status: string; count: number }[];
  topServices: [string, number][];
  customers: { total: number; blocked: number; new: number };
  products: { published: number; archived: number; soldOut: number };
}

export interface AnalyticsData {
  period: Period;
  kpis: { label: string; value: string; change: number | null }[];
  series: SeriesPoint[];
  division: DivisionSlice[];
  top: ProductSales[];
  methods: DivisionSlice[];
  byService: [string, number][];
  states: [string, number][];
  statuses: { s: string; n: number }[];
}
