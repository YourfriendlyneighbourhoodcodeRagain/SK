export type DeliveryStatus = 'WAITING' | 'RECEIVED' | 'ISSUE REPORTED';
export type StockStatus = 'AVAILABLE' | 'LOW STOCK' | 'OUT OF STOCK';

export type RetailerDelivery = {
  id: string;
  product: string;
  emoji: string;
  quantity: number;
  amount: number;
  distributor: string;
  retailer?: string;
  batchId: string;
  date: string;
  status: DeliveryStatus;
  receivedAt?: string;
  issue?: string;
};

export type StockItem = {
  product: string;
  emoji: string;
  quantity: number;
  batchId: string;
  status: StockStatus;
};

export type Sale = {
  id: string;
  product: string;
  emoji: string;
  quantity: number;
  amount: number;
  date: string;
  batchId: string;
};

export const retailerDemoDeliveries: RetailerDelivery[] = [
  { id: 'delivery-001', product: 'Tomato', emoji: '🍅', quantity: 50, amount: 2500, distributor: 'FreshLink Distributors', batchId: 'SK-2026-001', date: '23 Aug 2026', status: 'WAITING' },
  { id: 'delivery-002', product: 'Apple', emoji: '🍎', quantity: 30, amount: 3600, distributor: 'Himalayan Fresh', batchId: 'SK-2026-004', date: '21 Aug 2026', status: 'RECEIVED', receivedAt: '21 Aug 2026, 10:15' },
  { id: 'delivery-003', product: 'Mango', emoji: '🥭', quantity: 25, amount: 1875, distributor: 'Coastal Produce Network', batchId: 'SK-2026-002', date: '20 Aug 2026', status: 'RECEIVED', receivedAt: '20 Aug 2026, 11:05' },
];

export const retailerDemoStock: StockItem[] = [
  { product: 'Tomato', emoji: '🍅', quantity: 20, batchId: 'SK-2026-000', status: 'AVAILABLE' },
  { product: 'Spinach', emoji: '🥬', quantity: 20, batchId: 'SK-2026-003', status: 'LOW STOCK' },
  { product: 'Potato', emoji: '🥔', quantity: 35, batchId: 'SK-2026-005', status: 'AVAILABLE' },
  { product: 'Apple', emoji: '🍎', quantity: 18, batchId: 'SK-2026-004', status: 'AVAILABLE' },
  { product: 'Mango', emoji: '🥭', quantity: 12, batchId: 'SK-2026-002', status: 'LOW STOCK' },
  { product: 'Chilli', emoji: '🌶️', quantity: 8, batchId: 'SK-2026-006', status: 'LOW STOCK' },
];

export const retailerDemoSales: Sale[] = [
  { id: 'sale-001', product: 'Tomato', emoji: '🍅', quantity: 2, amount: 120, date: 'Today', batchId: 'SK-2026-000' },
  { id: 'sale-002', product: 'Spinach', emoji: '🥬', quantity: 1, amount: 60, date: 'Today', batchId: 'SK-2026-003' },
  { id: 'sale-003', product: 'Potato', emoji: '🥔', quantity: 3, amount: 90, date: 'Yesterday', batchId: 'SK-2026-005' },
];
