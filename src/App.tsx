/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  CreditCard, 
  Calendar, 
  LayoutDashboard, 
  Package, 
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Download,
  FileText,
  Table as TableIcon,
  ChevronDown
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RAW_DATA } from './data';
import { Sale } from './types';
import { cn, formatCurrency } from './lib/utils';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#3B82F6', '#64748B'];

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Stats calculation
  const stats = useMemo(() => {
    const totalRevenue = RAW_DATA.reduce((sum, sale) => sum + sale.price, 0);
    const uniqueOrders = new Set(RAW_DATA.map(s => s.orderNumber)).size;
    const uniqueProducts = new Set(RAW_DATA.map(s => s.product)).size;
    return {
      totalRevenue,
      totalOrders: uniqueOrders,
      averageOrderValue: totalRevenue / RAW_DATA.length,
      uniqueProducts
    };
  }, []);

  // Revenue Trends (by date)
  const revenueTrendData = useMemo(() => {
    const dailyMap: { [key: string]: number } = {};
    RAW_DATA.forEach(sale => {
      dailyMap[sale.date] = (dailyMap[sale.date] || 0) + sale.price;
    });
    return Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date: format(parseISO(date), 'MMM dd'),
        revenue
      }));
  }, []);

  // Sales by Product
  const productData = useMemo(() => {
    const productMap: { [key: string]: number } = {};
    RAW_DATA.forEach(sale => {
      productMap[sale.product] = (productMap[sale.product] || 0) + 1;
    });
    return Object.entries(productMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, []);

  // Payment Method data
  const paymentData = useMemo(() => {
    const paymentMap: { [key: string]: number } = {};
    RAW_DATA.forEach(sale => {
      paymentMap[sale.paymentMethod] = (paymentMap[sale.paymentMethod] || 0) + 1;
    });
    return Object.entries(paymentMap).map(([name, value]) => ({ name, value }));
  }, []);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return RAW_DATA.filter(sale => {
      const matchesSearch = sale.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.product.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProduct = !selectedProduct || sale.product === selectedProduct;
      return matchesSearch && matchesProduct;
    });
  }, [searchTerm, selectedProduct]);

  const exportToPDF = async () => {
    if (!dashboardRef.current) return;
    setShowExportMenu(false);
    
    // Capture the dashboard content
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#F8FAFC',
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`TrendTrack-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToCSV = () => {
    setShowExportMenu(false);
    const headers = ['Order Number', 'Product', 'Price', 'Date', 'Payment Method'];
    const rows = filteredTransactions.map(sale => [
      sale.orderNumber,
      sale.product,
      sale.price.toFixed(2),
      sale.date,
      sale.paymentMethod
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TrendTrack-Data-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Total Revenue" 
                value={formatCurrency(stats.totalRevenue)} 
                trend="+14.2%" 
                trendUp={true} 
              />
              <StatCard 
                title="Total Sales" 
                value={stats.totalOrders.toString()} 
                trend="+5.8%" 
                trendUp={true} 
              />
              <StatCard 
                title="Avg. Order Value" 
                value={formatCurrency(stats.averageOrderValue)} 
                trend="-1.2%" 
                trendUp={false} 
              />
              <StatCard 
                title="Total Products" 
                value={stats.uniqueProducts.toString()} 
                trend="Stable" 
                trendUp={undefined} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Trend Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-slate-800">Performance Trend</h4>
                  <select className="text-xs bg-slate-100 border-none rounded-md py-1.5 px-3 outline-none cursor-pointer">
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrendData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#2563EB" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Circular Stats / Payment Method */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <div className="w-full mb-6">
                  <h4 className="font-bold text-slate-800">Payment Distribution</h4>
                </div>
                <div className="relative w-48 h-48 mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-800">{RAW_DATA.length}</span>
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Total Sales</span>
                  </div>
                </div>
                <div className="w-full space-y-3">
                  {paymentData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'][index % 4] }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{Math.round((item.value / RAW_DATA.length) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Table Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h4 className="font-bold text-slate-800">Recent Records</h4>
                <div className="flex items-center gap-4">
                  <select 
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-3 outline-none cursor-pointer text-slate-600"
                    onChange={(e) => setSelectedProduct(e.target.value === 'all' ? null : e.target.value)}
                  >
                    <option value="all">All Products</option>
                    {productData.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                  <button className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence mode="popLayout">
                      {filteredTransactions.slice(0, 10).map((transaction, idx) => (
                        <motion.tr 
                          key={`${transaction.orderNumber}-${idx}`}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "text-sm hover:bg-slate-50/50 transition-colors",
                            idx % 2 === 1 && "bg-slate-50/30"
                          )}
                        >
                          <td className="px-6 py-4 font-mono font-medium text-blue-600">{transaction.orderNumber}</td>
                          <td className="px-6 py-4 font-medium text-slate-700">{transaction.product}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-xs font-bold",
                              transaction.paymentMethod === 'Credit Card' ? "bg-blue-100 text-blue-700" :
                              transaction.paymentMethod === 'eWallet' ? "bg-purple-100 text-purple-700" :
                              transaction.paymentMethod === 'Cash' ? "bg-emerald-100 text-emerald-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {transaction.paymentMethod}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{format(parseISO(transaction.date), 'MMM dd, yyyy')}</td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-900">{formatCurrency(transaction.price)}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-slate-400 font-medium">No records found matching criteria</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'customers':
        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Customers Segment Overview</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              This area will feature advanced customer metrics, retention rates, and demographic breakdowns. 
              Our intelligence engine is currently aggregating user behaviors.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center">
                  <div className="w-10 h-2 bg-slate-200 rounded mb-2"></div>
                  <div className="w-16 h-4 bg-slate-300 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="p-12 text-center text-slate-400">
            <div className="mb-4 flex justify-center">
              <LayoutDashboard className="w-12 h-12 opacity-20" />
            </div>
            <p className="font-medium italic">Content for {activeTab} is currently being prepared by the nexus core.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
          </div>
          <span className="text-white font-bold text-xl tracking-tight font-display">TrendTrack</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Overview" 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')} 
          />
          <NavItem 
            icon={<TrendingUp className="w-5 h-5" />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')} 
          />
          <NavItem 
            icon={<ShoppingBag className="w-5 h-5" />} 
            label="Products" 
            active={activeTab === 'products'} 
            onClick={() => setActiveTab('products')} 
          />
          <NavItem 
            icon={<Users className="w-5 h-5" />} 
            label="Customers" 
            active={activeTab === 'customers'} 
            onClick={() => setActiveTab('customers')} 
          />
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
              AS
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Admin User</span>
              <span className="text-xs text-slate-500">Pro Account</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 font-display">
            {activeTab === 'overview' ? 'Sales Intelligence' : 
             activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Insights'}
          </h1>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search sales..." 
                className="bg-slate-100 border-none rounded-full py-2.5 pl-11 pr-4 text-sm w-64 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={cn(
                  "bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2",
                  showExportMenu && "ring-2 ring-blue-500 ring-offset-2"
                )}
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className={cn("w-4 h-4 transition-transform", showExportMenu && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {showExportMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowExportMenu(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      <button 
                        onClick={exportToCSV}
                        className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <TableIcon className="w-4 h-4 text-slate-400" />
                        Export to CSV
                      </button>
                      <button 
                        onClick={exportToPDF}
                        className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-100"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        Export to PDF
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Content Viewport */}
        <div className="flex-1 p-8 overflow-y-auto" ref={dashboardRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all duration-200 group",
        active 
          ? "bg-blue-600/10 text-blue-400" 
          : "text-slate-400 hover:text-white"
      )}
    >
      <span className={cn("transition-colors", active ? "text-blue-400" : "group-hover:text-white")}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function StatCard({ title, value, trend, trendUp }: { title: string, value: string, trend: string, trendUp?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-bold text-slate-900 font-display">{value}</h3>
        {trendUp !== undefined && (
          <span className={cn(
            "text-sm font-semibold",
            trendUp === true ? "text-emerald-500" : "text-rose-500"
          )}>
            {trend}
          </span>
        )}
        {trendUp === undefined && (
          <span className="text-slate-400 text-sm font-medium">{trend}</span>
        )}
      </div>
    </div>
  );
}

