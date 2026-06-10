import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { 
  LayoutDashboard, 
  Briefcase, 
  History, 
  Calendar, 
  Newspaper, 
  TrendingUp, 
  Plus, 
  Upload, 
  LogOut,
  ChevronRight,
  TrendingDown,
  DollarSign,
  Search,
  Edit2,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';

// Views
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const sectorData = [
  { name: 'Technology', value: 45 },
  { name: 'Financials', value: 15 },
  { name: 'Healthcare', value: 10 },
  { name: 'Energy', value: 12 },
  { name: 'Consumer', value: 18 },
];

const geoData = [
  { name: 'North America', value: 65 },
  { name: 'Europe', value: 15 },
  { name: 'Asia Pacific', value: 12 },
  { name: 'Emerging Markets', value: 8 },
];

const ETF_LOOKTHROUGH: Record<string, { symbol: string, weight: number }[]> = {
  'VOO': [
    { symbol: 'AAPL', weight: 7.1 },
    { symbol: 'MSFT', weight: 6.5 },
    { symbol: 'AMZN', weight: 3.4 },
    { symbol: 'NVDA', weight: 2.8 },
    { symbol: 'GOOGL', weight: 2.1 },
  ],
  'QQQ': [
    { symbol: 'AAPL', weight: 11.5 },
    { symbol: 'MSFT', weight: 9.8 },
    { symbol: 'AMZN', weight: 5.2 },
    { symbol: 'NVDA', weight: 4.1 },
    { symbol: 'TSLA', weight: 3.5 },
  ],
  'VTI': [
    { symbol: 'AAPL', weight: 6.2 },
    { symbol: 'MSFT', weight: 5.6 },
    { symbol: 'AMZN', weight: 2.9 },
    { symbol: 'NVDA', weight: 2.4 },
    { symbol: 'BRK.B', weight: 1.8 },
  ]
};

const benchmarkData: Record<string, Record<string, any[]>> = {
  'S&P 500': {
    '1D': [{ name: '9AM', value: 4100 }, { name: '11AM', value: 4120 }, { name: '1PM', value: 4150 }, { name: '3PM', value: 4180 }, { name: '5PM', value: 4256 }],
    '1W': [{ name: 'Mon', value: 4100 }, { name: 'Tue', value: 4150 }, { name: 'Wed', value: 4200 }, { name: 'Thu', value: 4180 }, { name: 'Fri', value: 4256 }],
    '1M': [{ name: 'W1', value: 3900 }, { name: 'W2', value: 4050 }, { name: 'W3', value: 4100 }, { name: 'W4', value: 4256 }],
    'YTD': [{ name: 'Jan', value: 3800 }, { name: 'Mar', value: 3950 }, { name: 'Jun', value: 4100 }, { name: 'Sep', value: 4200 }, { name: 'Dec', value: 4256 }],
    '5Y': [{ name: '2022', value: 3200 }, { name: '2023', value: 3500 }, { name: '2024', value: 3800 }, { name: '2025', value: 4100 }, { name: '2026', value: 4256 }],
  },
  'NASDAQ': {
    '1D': [{ name: '9AM', value: 15000 }, { name: '11AM', value: 15100 }, { name: '1PM', value: 15200 }, { name: '3PM', value: 15300 }, { name: '5PM', value: 15500 }],
    '1W': [{ name: 'Mon', value: 15000 }, { name: 'Tue', value: 15100 }, { name: 'Wed', value: 15300 }, { name: 'Thu', value: 15200 }, { name: 'Fri', value: 15500 }],
    '1M': [{ name: 'W1', value: 14500 }, { name: 'W2', value: 14800 }, { name: 'W3', value: 15100 }, { name: 'W4', value: 15500 }],
    'YTD': [{ name: 'Jan', value: 13500 }, { name: 'Mar', value: 14000 }, { name: 'Jun', value: 14800 }, { name: 'Sep', value: 15200 }, { name: 'Dec', value: 15500 }],
    '5Y': [{ name: '2022', value: 11000 }, { name: '2023', value: 12500 }, { name: '2024', value: 13800 }, { name: '2025', value: 14800 }, { name: '2026', value: 15500 }],
  },
  'Dow Jones': {
    '1D': [{ name: '9AM', value: 35000 }, { name: '11AM', value: 35100 }, { name: '1PM', value: 35200 }, { name: '3PM', value: 35400 }, { name: '5PM', value: 35800 }],
    '1W': [{ name: 'Mon', value: 35000 }, { name: 'Tue', value: 35200 }, { name: 'Wed', value: 35100 }, { name: 'Thu', value: 35400 }, { name: 'Fri', value: 35800 }],
    '1M': [{ name: 'W1', value: 34500 }, { name: 'W2', value: 34800 }, { name: 'W3', value: 35200 }, { name: 'W4', value: 35800 }],
    'YTD': [{ name: 'Jan', value: 33500 }, { name: 'Mar', value: 34200 }, { name: 'Jun', value: 35000 }, { name: 'Sep', value: 35400 }, { name: 'Dec', value: 35800 }],
    '5Y': [{ name: '2022', value: 31000 }, { name: '2023', value: 32500 }, { name: '2024', value: 33800 }, { name: '2025', value: 34800 }, { name: '2026', value: 35800 }],
  }
};

const Dashboard = () => {
  const [benchmark, setBenchmark] = useState('S&P 500');
  const [timeframe, setTimeframe] = useState('1M');
  const [allocationView, setAllocationView] = useState<'sector' | 'geo'>('sector');

  const timeframes = ['1D', '1W', '1M', 'YTD', '5Y'];

  const currentAllocationData = allocationView === 'sector' ? sectorData : geoData;

  return (
    <div id="dashboard" className="space-y-6">
      <header className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f6fc]">Market Overview</h1>
          <p className="text-text-secondary">Welcome back to your portfolio tracker.</p>
        </div>
        <div className="flex items-center space-x-6 text-right">
            <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Index Comparison</p>
                <select 
                    value={benchmark} 
                    onChange={(e) => setBenchmark(e.target.value)}
                    className="bg-surface border border-border rounded px-2 py-1 text-xs font-bold text-accent focus:outline-none cursor-pointer"
                >
                    <option value="S&P 500">S&P 500</option>
                    <option value="NASDAQ">NASDAQ</option>
                    <option value="Dow Jones">Dow Jones</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                </select>
            </div>
            <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Protocol Sync</p>
                <p className="text-sm font-semibold text-success flex items-center">
                    <span className="w-1.5 h-1.5 bg-success rounded-full mr-2 animate-pulse"></span>
                    Verified
                </p>
            </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-surface p-4 rounded-xl border border-border">
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1">Total Balance</p>
          <h2 className="text-2xl font-bold">$142,850.42</h2>
          <p className="text-success text-xs mt-2 font-medium flex items-center">
            ▲ 2.4% (+$3,340)
          </p>
        </motion.div>
        
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} className="bg-surface p-4 rounded-xl border border-border">
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1">Annual Yield</p>
          <h2 className="text-2xl font-bold">3.82%</h2>
          <p className="text-text-secondary text-xs mt-2 font-medium">$5,456 projected</p>
        </motion.div>

        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} className="bg-surface p-4 rounded-xl border border-border">
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1">Top Mover</p>
          <h2 className="text-2xl font-bold">NVDA</h2>
          <p className="text-success text-xs mt-2 font-medium">+84.2% YTD</p>
        </motion.div>

        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} className="bg-surface p-4 rounded-xl border border-border">
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-1">Cash Reserve</p>
          <h2 className="text-2xl font-bold">$12,400.00</h2>
          <p className="text-text-secondary text-xs mt-2 font-medium">8.6% of portfolio</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-surface p-6 rounded-xl border border-border">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold">Historical Performance</h3>
                  <div className="flex space-x-2 mt-2">
                    {timeframes.map(tf => (
                        <button 
                            key={tf} 
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1 rounded text-[10px] font-black tracking-widest transition-all ${
                                timeframe === tf ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-alt'
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-xs text-accent font-bold"><span className="w-2 h-2 bg-accent rounded-full mr-2"></span> Portfolio</span>
                  <span className="flex items-center text-xs text-text-secondary font-bold"><span className="w-2 h-2 bg-border border border-text-secondary rounded-full mr-2"></span> {benchmark}</span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={benchmarkData[benchmark]?.[timeframe] || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#30363d" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8b949e' }} />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#161b22', borderRadius: '8px', border: '1px solid #30363d', color: '#f0f6fc' }}
                            itemStyle={{ color: '#f0f6fc' }}
                            cursor={{ fill: '#21262d' }}
                        />
                        <Bar dataKey="value" fill="#2f81f7" radius={[4, 4, 0, 0]} barSize={timeframe === '1D' ? 60 : 30} />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-surface p-6 rounded-xl border border-border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Allocation</h3>
                <div className="flex bg-surface-alt p-1 rounded-lg border border-border">
                    <button 
                        onClick={() => setAllocationView('sector')}
                        className={`px-3 py-1 rounded text-[10px] font-black tracking-widest transition-all ${
                            allocationView === 'sector' ? 'bg-accent text-white' : 'text-text-secondary hover:text-[#f0f6fc]'
                        }`}
                    >
                        SECTOR
                    </button>
                    <button 
                        onClick={() => setAllocationView('geo')}
                        className={`px-3 py-1 rounded text-[10px] font-black tracking-widest transition-all ${
                            allocationView === 'geo' ? 'bg-accent text-white' : 'text-text-secondary hover:text-[#f0f6fc]'
                        }`}
                    >
                        REGION
                    </button>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={currentAllocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {currentAllocationData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#161b22', borderRadius: '8px', border: '1px solid #30363d', color: '#f0f6fc' }} />
                    </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                  {currentAllocationData.map((d, i) => (
                      <div key={d.name} className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                          <span className="text-[10px] font-bold text-text-secondary uppercase">{d.name}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};

const PortfolioView = ({ portfolioId }: { portfolioId: string }) => {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAsset, setNewAsset] = useState({ 
    symbol: '', 
    name: '', 
    quantity: '', 
    price: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [transactionData, setTransactionData] = useState({ 
    quantity: '', 
    price: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  const lookupTicker = async (symbol: string) => {
    if (!symbol) return;
    setLoadingDetails(true);
    try {
        const [profileRes, priceRes] = await Promise.all([
            fetch(`/api/market/profile/${symbol.toUpperCase()}`),
            fetch(`/api/market/price/${symbol.toUpperCase()}`)
        ]);
        const profile = await profileRes.json();
        const price = await priceRes.json();

        if (editingAsset) {
            setTransactionData(prev => ({ ...prev, price: price.c?.toString() || prev.price }));
        } else {
            setNewAsset(prev => ({
                ...prev,
                name: profile.name || prev.name,
                price: price.c?.toString() || prev.price
            }));
        }
    } catch (err) {
        console.error("Lookup failed", err);
    } finally {
        setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (!portfolioId) return;

    if (portfolioId === 'mock-portfolio-id') {
        setHoldings([
            { id: 'h1', symbol: 'AAPL', name: 'Apple Inc.', quantity: 15, averagePrice: 150.20, currentPrice: 175.40 },
            { id: 'h2', symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 10, averagePrice: 280.50, currentPrice: 420.10 },
            { id: 'h3', symbol: 'VOO', name: 'Vanguard S&P 500 ETF', quantity: 25, averagePrice: 380.00, currentPrice: 460.15 },
            { id: 'h4', symbol: 'NVDA', name: 'NVIDIA Corporation', quantity: 5, averagePrice: 450.00, currentPrice: 920.40 },
        ]);
        return;
    }

    const q = query(collection(db, 'portfolios', portfolioId, 'holdings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHoldings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `portfolios/${portfolioId}/holdings`));
    return unsubscribe;
  }, [portfolioId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioId) return;

    if (portfolioId === 'mock-portfolio-id') {
        const h = {
            id: 'mock-' + Date.now(),
            symbol: newAsset.symbol.toUpperCase(),
            name: newAsset.name,
            quantity: parseFloat(newAsset.quantity),
            averagePrice: parseFloat(newAsset.price),
            currentPrice: parseFloat(newAsset.price),
            purchaseDate: newAsset.date
        };
        setHoldings(prev => [...prev, h]);
        setIsAdding(false);
        setNewAsset({ 
            symbol: '', 
            name: '', 
            quantity: '', 
            price: '', 
            date: new Date().toISOString().split('T')[0] 
        });
        return;
    }

    try {
      await addDoc(collection(db, 'portfolios', portfolioId, 'holdings'), {
        symbol: newAsset.symbol.toUpperCase(),
        name: newAsset.name,
        quantity: parseFloat(newAsset.quantity),
        averagePrice: parseFloat(newAsset.price),
        currentPrice: parseFloat(newAsset.price),
        purchaseDate: newAsset.date,
        lastUpdate: serverTimestamp()
      });
      setIsAdding(false);
      setNewAsset({ 
        symbol: '', 
        name: '', 
        quantity: '', 
        price: '', 
        date: new Date().toISOString().split('T')[0] 
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `portfolios/${portfolioId}/holdings`);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioId || !editingAsset) return;

    if (portfolioId === 'mock-portfolio-id') {
      alert("Mock transactions are local-only for this demo session.");
      const qty = parseFloat(transactionData.quantity);
      const prc = parseFloat(transactionData.price);
      
      setHoldings(prev => prev.map(h => {
        if (h.id === editingAsset.id) {
          const newQty = transactionType === 'BUY' ? h.quantity + qty : h.quantity - qty;
          // Weighted average price update on BUY
          const newAvg = transactionType === 'BUY' 
            ? ((h.quantity * h.averagePrice) + (qty * prc)) / newQty
            : h.averagePrice;
            
          return { ...h, quantity: Math.max(0, newQty), averagePrice: newAvg };
        }
        return h;
      }));
      setEditingAsset(null);
      return;
    }

    try {
      const docRef = doc(db, 'portfolios', portfolioId, 'holdings', editingAsset.id);
      const qty = parseFloat(transactionData.quantity);
      const prc = parseFloat(transactionData.price);

      const newQuantity = transactionType === 'BUY' ? editingAsset.quantity + qty : editingAsset.quantity - qty;
      const newAveragePrice = transactionType === 'BUY' 
        ? ((editingAsset.quantity * editingAsset.averagePrice) + (qty * prc)) / newQuantity
        : editingAsset.averagePrice;

      await updateDoc(docRef, {
        quantity: Math.max(0, newQuantity),
        averagePrice: newAveragePrice,
        lastUpdate: serverTimestamp()
      });
      setEditingAsset(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `portfolios/${portfolioId}/holdings/${editingAsset.id}`);
    }
  };

  const handleRemove = async (id: string) => {
    if (!portfolioId) return;
    if (!confirm('Are you sure you want to remove this asset?')) return;

    if (portfolioId === 'mock-portfolio-id') {
        setHoldings(prev => prev.filter(h => h.id !== id));
        return;
    }

    try {
      await deleteDoc(doc(db, 'portfolios', portfolioId, 'holdings', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `portfolios/${portfolioId}/holdings/${id}`);
    }
  };

  return (
    <div id="portfolio" className="space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-6">
        <h2 className="text-2xl font-bold">My Holdings</h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-accent text-white px-4 py-2 rounded-lg flex items-center text-sm font-bold shadow-lg shadow-accent/20 hover:opacity-90 transition-all"
          >
            <Plus size={18} className="mr-2" /> Add Asset
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-surface p-6 rounded-xl border border-border shadow-sm overflow-hidden mb-8">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Ticker Symbol</label>
                <div className="flex">
                    <input 
                        placeholder="AAPL, BTC, etc" 
                        value={newAsset.symbol} 
                        onChange={e => setNewAsset({...newAsset, symbol: e.target.value})}
                        onBlur={() => lookupTicker(newAsset.symbol)}
                        className="w-full px-4 py-2 bg-bg border border-border rounded-l-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent transition-colors"
                        required
                    />
                    <button 
                        type="button"
                        onClick={() => lookupTicker(newAsset.symbol)}
                        className="bg-accent px-3 rounded-r-lg text-white hover:bg-accent/80 transition-colors"
                    >
                        {loadingDetails ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search size={16} />}
                    </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Asset Name</label>
                <input 
                    placeholder="Company Name" 
                    value={newAsset.name} 
                    onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                    className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent transition-colors"
                    required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Transaction Date</label>
                <input 
                    type="date"
                    value={newAsset.date} 
                    onChange={e => setNewAsset({...newAsset, date: e.target.value})}
                    className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent transition-colors"
                    required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Quantity</label>
                <input 
                    placeholder="0.00" 
                    type="number" 
                    step="any"
                    value={newAsset.quantity} 
                    onChange={e => setNewAsset({...newAsset, quantity: e.target.value})}
                    className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent transition-colors"
                    required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Execution Price</label>
                <input 
                    placeholder="0.00" 
                    type="number" 
                    step="any"
                    value={newAsset.price} 
                    onChange={e => setNewAsset({...newAsset, price: e.target.value})}
                    className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent transition-colors"
                    required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-text-secondary font-bold text-sm bg-surface-alt border border-border rounded-lg hover:bg-border transition-colors">Cancel</button>
              <button type="submit" className="px-10 py-2 bg-accent text-white rounded-lg font-bold text-sm shadow-lg shadow-accent/20 hover:opacity-90 transition-all">Add to Portfolio</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#1c2128] border-b border-border">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Asset</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Symbol</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Qty</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Avg Price</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Market Price</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Return</th>
              <th className="px-6 py-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {holdings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-text-secondary italic">No holdings found. Start by adding a transaction or importing from Sheets.</td>
              </tr>
            ) : holdings.map(h => {
              const isETF = !!ETF_LOOKTHROUGH[h.symbol];
              const isExpanded = expandedId === h.id;
              const isEditing = editingAsset?.id === h.id;
              
              return (
                <React.Fragment key={h.id}>
                  <tr 
                    className={`hover:bg-surface-alt transition-colors group ${isExpanded || isEditing ? 'bg-surface-alt/50' : ''}`}
                  >
                    <td onClick={() => isETF && setExpandedId(isExpanded ? null : h.id)} className="px-6 py-4 font-bold text-[#f0f6fc] cursor-pointer">
                        <div className="flex items-center">
                            {h.name}
                            {isETF && (
                                <span className="ml-2 text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded border border-accent/30 font-black">ETF</span>
                            )}
                        </div>
                    </td>
                    <td onClick={() => isETF && setExpandedId(isExpanded ? null : h.id)} className="px-6 py-4 text-text-secondary font-mono text-sm cursor-pointer">{h.symbol}</td>
                    <td className="px-6 py-4 text-right tabular-nums font-medium">{h.quantity}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-text-secondary">${h.averagePrice?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right tabular-nums font-bold text-accent">${h.currentPrice?.toFixed(2)}</td>
                    <td className={`px-6 py-4 text-right tabular-nums font-black ${h.currentPrice > h.averagePrice ? 'text-success' : 'text-danger'}`}>
                      {h.currentPrice > h.averagePrice ? '▲' : '▼'} {Math.abs(((h.currentPrice - h.averagePrice) / h.averagePrice * 100)).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => {
                                    setEditingAsset(h);
                                    setTransactionData({ quantity: '', price: h.currentPrice.toString() });
                                }}
                                className="p-1.5 text-text-secondary hover:text-accent transition-colors"
                                title="Transaction"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button 
                                onClick={() => handleRemove(h.id)}
                                className="p-1.5 text-text-secondary hover:text-danger transition-colors"
                                title="Remove"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="bg-surface-alt">
                        <td colSpan={7} className="px-6 py-6 animate-in fade-in slide-in-from-top-1">
                            <div className="max-w-xl mx-auto bg-surface border border-border p-6 rounded-xl shadow-xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold flex items-center">
                                        <Edit2 size={16} className="mr-2 text-accent" />
                                        Adjust Position: {h.symbol}
                                    </h4>
                                    <div className="flex bg-surface-alt p-1 rounded-lg border border-border">
                                        <button 
                                            onClick={() => setTransactionType('BUY')}
                                            className={`px-3 py-1 rounded text-[10px] font-black transition-all ${
                                                transactionType === 'BUY' ? 'bg-success text-white' : 'text-text-secondary'
                                            }`}
                                        >
                                            BUY
                                        </button>
                                        <button 
                                            onClick={() => setTransactionType('SELL')}
                                            className={`px-3 py-1 rounded text-[10px] font-black transition-all ${
                                                transactionType === 'SELL' ? 'bg-danger text-white' : 'text-text-secondary'
                                            }`}
                                        >
                                            SELL
                                        </button>
                                    </div>
                                </div>
                                <form onSubmit={handleTransaction} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Date</label>
                                        <input 
                                            type="date" required
                                            value={transactionData.date}
                                            onChange={e => setTransactionData({...transactionData, date: e.target.value})}
                                            className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Quantity</label>
                                        <input 
                                            type="number" step="any" required
                                            value={transactionData.quantity}
                                            onChange={e => setTransactionData({...transactionData, quantity: e.target.value})}
                                            className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Execution Price</label>
                                        <input 
                                            type="number" step="any" required
                                            value={transactionData.price}
                                            onChange={e => setTransactionData({...transactionData, price: e.target.value})}
                                            className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex items-end space-x-2">
                                        <button type="submit" className={`flex-1 py-3 rounded-lg font-bold text-sm text-white ${transactionType === 'BUY' ? 'bg-success' : 'bg-danger'}`}>
                                            Confirm {transactionType}
                                        </button>
                                        <button type="button" onClick={() => setEditingAsset(null)} className="px-4 py-3 text-text-secondary font-bold text-sm bg-surface-alt border border-border rounded-lg">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </td>
                    </tr>
                  )}
                  {isExpanded && isETF && (
                    <tr className="bg-[#1c2128]/50">
                        <td colSpan={7} className="px-10 py-4">
                            <div className="border-l-2 border-accent/30 pl-4 space-y-3">
                                <p className="text-[10px] font-black tracking-[0.2em] text-text-secondary uppercase mb-2">Underlying Holdings Look-through</p>
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    {ETF_LOOKTHROUGH[h.symbol].map(sub => (
                                        <div key={sub.symbol} className="bg-surface p-3 rounded-lg border border-border/50">
                                            <p className="text-xs font-bold text-[#f0f6fc]">{sub.symbol}</p>
                                            <div className="flex justify-between items-end mt-1">
                                                <span className="text-[10px] text-text-secondary font-bold uppercase">Weight</span>
                                                <span className="text-xs font-black text-accent">{sub.weight}%</span>
                                            </div>
                                            <div className="w-full bg-border h-1 mt-2 rounded-full overflow-hidden">
                                                <div className="bg-accent h-full" style={{ width: `${sub.weight * 5}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const GoogleSheetsImport = ({ portfolioId }: { portfolioId: string }) => {
    const [sheetId, setSheetId] = useState('');
    const [importing, setImporting] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleImport = async () => {
        let actualId = sheetId;
        // Extract ID from full Google Sheets URL if user pasted the whole thing
        // Pattern: .../spreadsheets/d/[ID]/...
        const urlMatch = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (urlMatch && urlMatch[1]) {
            actualId = urlMatch[1];
        }

        try {
            const res = await fetch('/api/auth/google/url');
            if (!res.ok) {
                const err = await res.json();
                setStatus(err.error || 'Configuration error');
                return;
            }
            const { url } = await res.json();
            const popup = window.open(url, 'google_auth', 'width=600,height=700');
            if (!popup) {
                alert('Please enable popups to connect Google Sheets.');
            }
        } catch (err) {
            setStatus('Failed to reach backend server.');
        }
    };

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
                const tokens = event.data.tokens;
                if (!sheetId) {
                    setStatus('Please enter a Spreadsheet ID first.');
                    return;
                }
                
                setImporting(true);
                setStatus('Fetching data from sheet...');

                try {
                    const response = await fetch('/api/sheets/holdings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tokens, spreadsheetId: sheetId })
                    });
                    const rows = await response.json();
                    
                    if (Array.isArray(rows) && rows.length > 1) {
                        // Assuming header row: Symbol, Name, Qty, Price
                        const dataRows = rows.slice(1);
                        let count = 0;
                        for (const row of dataRows) {
                            if (row[0] && row[2]) {
                                await addDoc(collection(db, 'portfolios', portfolioId, 'holdings'), {
                                    symbol: row[0].toString().toUpperCase(),
                                    name: row[1]?.toString() || row[0].toString(),
                                    quantity: parseFloat(row[2]) || 0,
                                    averagePrice: parseFloat(row[3]) || 0,
                                    currentPrice: parseFloat(row[3]) || 0,
                                    lastUpdate: serverTimestamp()
                                });
                                count++;
                            }
                        }
                        setStatus(`Successfully imported ${count} assets!`);
                    } else {
                        setStatus('No data found in the spreadsheet.');
                    }
                } catch (error) {
                    console.error("Import error:", error);
                    setStatus('Import failed. Check ID and permissions.');
                } finally {
                    setImporting(false);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [sheetId, portfolioId]);

    return (
        <div className="bg-surface p-8 rounded-xl border border-dashed border-border flex flex-col items-center justify-center space-y-6">
            <div className="p-4 bg-accent/10 text-accent rounded-xl border border-accent/20">
                <Upload size={32} />
            </div>
            <div className="text-center max-w-sm">
                <h3 className="text-xl font-bold mb-2 text-[#f0f6fc]">Sync Spreadsheet / Google Finance</h3>
                <p className="text-text-secondary text-sm mb-4">Paste the Spreadsheet ID from your browser URL. To sync Google Finance: Export your portfolio to a Sheet first, then link it here.</p>
                <input 
                    placeholder="Spreadsheet ID (from URL)"
                    value={sheetId}
                    onChange={e => setSheetId(e.target.value)}
                    className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent transition-colors mb-4"
                />
            </div>
            <button 
                onClick={handleImport}
                disabled={importing || !sheetId}
                className="bg-accent text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
                {importing ? 'Processing...' : 'Authorize & Sync'}
            </button>
            {status && <p className="text-xs font-bold uppercase tracking-widest text-accent mt-4">{status}</p>}
        </div>
    );
};

const MarketCalendar = () => {
    const events = [
        { date: '2026-05-15', title: 'NVDA Dividend Payment', type: 'dividend', amount: '$45.20' },
        { date: '2026-05-20', title: 'MSFT Earnings Release', type: 'earnings' },
        { date: '2026-06-01', title: 'AAPL Dividend Ex-Date', type: 'dividend', amount: '$32.10' },
        { date: '2026-06-10', title: 'Fed Interest Rate Decision', type: 'macro' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                {events.map((e, i) => (
                    <div key={i} className="flex items-center p-6 border-b border-border last:border-0 hover:bg-surface-alt transition-colors group">
                        <div className="w-16 flex flex-col items-center justify-center border-r border-border pr-6 mr-6">
                            <span className="text-[10px] font-bold text-text-secondary uppercase">{new Date(e.date).toLocaleString('en-US', { month: 'short' })}</span>
                            <span className="text-xl font-black">{new Date(e.date).getDate()}</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-[#f0f6fc] group-hover:text-accent transition-colors">{e.title}</h4>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">{e.type}</p>
                        </div>
                        {e.amount && (
                            <div className="text-right">
                                <p className="text-lg font-black text-success">{e.amount}</p>
                                <p className="text-[10px] text-text-secondary font-bold uppercase">Estimated</p>
                            </div>
                        )}
                        <ChevronRight className="ml-6 text-border group-hover:text-text-secondary" size={20} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const NewsFeed = () => {
    const [search, setSearch] = useState('');
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const defaultNews = [
        { headline: 'Tech Giants Rally as AI Demand Surges', source: 'Financial Times', datetime: Date.now() / 1000, summary: 'Market leading firms see growth...' },
        { headline: 'Fed Signals Potential Rate Cut in Q3', source: 'Reuters', datetime: Date.now() / 1000, summary: 'Economy showing signs of cooling...' },
    ];

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!search) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/market/news/${search.toUpperCase()}`);
            const data = await res.json();
            setNews(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface p-6 rounded-xl border border-border">
                <div>
                    <h2 className="text-2xl font-bold text-[#f0f6fc]">Market Intelligence</h2>
                    <p className="text-xs text-text-secondary">Real-time sentiment and analyst updates.</p>
                </div>
                <form onSubmit={handleSearch} className="flex space-x-2">
                    <input 
                        placeholder="Search Symbol (e.g. BTC, NVDA)" 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="px-4 py-2 bg-bg border border-border rounded-lg text-sm text-[#f0f6fc] focus:outline-none focus:border-accent"
                    />
                    <button type="submit" className="bg-accent p-2 rounded-lg text-white">
                        <Search size={20} />
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(news.length > 0 ? news : defaultNews).map((n, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={i} 
                        className="bg-surface p-6 rounded-xl border border-border shadow-sm hover:border-accent/40 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded border border-accent/20 uppercase tracking-tighter">{n.source}</span>
                            <span className="text-[10px] font-bold text-text-secondary uppercase">
                                {new Date(n.datetime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <h4 className="font-bold text-base mb-4 group-hover:text-[#f0f6fc] transition-colors leading-snug line-clamp-2">{n.headline}</h4>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-4">{n.summary}</p>
                        <div className="flex items-center space-x-2">
                            <div className={`w-1.5 h-1.5 rounded-full bg-success`}></div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest text-success`}>Neutral / Positive</span>
                        </div>
                    </motion.div>
                ))}
                {loading && <div className="col-span-full py-10 text-center animate-pulse text-accent font-bold">Scanning Global Feeds...</div>}
            </div>
        </div>
    );
};

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolioId, setPortfolioId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Bypass Firestore for mock guest accounts
    if (user.uid === 'mock-user-id') {
      setPortfolioId('mock-portfolio-id');
      return;
    }

    const q = query(collection(db, 'portfolios'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        addDoc(collection(db, 'portfolios'), {
          userId: user.uid,
          name: 'Main Portfolio',
          updatedAt: serverTimestamp()
        });
      } else {
        setPortfolioId(snapshot.docs[0].id);
      }
    });
    return unsubscribe;
  }, [user]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Holdings', icon: Briefcase },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'calendar', label: 'Dividends', icon: Calendar },
    { id: 'news', label: 'Market News', icon: Newspaper },
  ];

  return (
    <div className="flex h-screen bg-bg text-[#f0f6fc] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-surface border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
                <TrendingUp size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight uppercase">Nexus Portfolio</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 py-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-surface-alt text-[#f0f6fc] border border-border shadow-inner' 
                  : 'text-text-secondary hover:text-[#f0f6fc] hover:bg-surface-alt/50'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-accent' : ''} />
              <span>{item.label}</span>
            </button>
          ))}
          <div className="pt-4 px-3">
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Sync Status</p>
                <p className="text-[10px] text-text-secondary">Cloud Sync: Active</p>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center text-accent text-xs font-bold border border-border">
              {user?.displayName?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-[#f0f6fc]">{user?.displayName || 'User'}</p>
              <p className="text-[10px] text-text-secondary truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-surface-alt border border-border rounded-lg text-xs font-bold text-text-secondary hover:text-danger hover:border-danger/30 transition-all"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 custom-scrollbar overflow-y-auto">
        <div className="p-10 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'portfolio' && portfolioId && (
                <div className="space-y-12">
                    <PortfolioView portfolioId={portfolioId} />
                    <GoogleSheetsImport portfolioId={portfolioId} />
                </div>
              )}
              {activeTab === 'transactions' && (
                <div className="flex flex-col items-center justify-center py-32 space-y-4 border border-dashed border-border rounded-xl bg-surface">
                    <History size={48} className="text-text-secondary opacity-20" />
                    <p className="text-text-secondary font-bold text-sm tracking-widest uppercase">Transaction History Unlocked</p>
                </div>
              )}
              {activeTab === 'calendar' && <MarketCalendar />}
              {activeTab === 'news' && <NewsFeed />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const LoginPage = () => {
  const { login, skipAuth } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6 font-sans">
      <div className="max-w-md w-full bg-surface p-12 rounded-3xl shadow-2xl border border-border text-center overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent shadow-[0_0_15px_rgba(47,129,247,0.5)]"></div>
        <div className="w-16 h-16 bg-accent rounded-xl mx-auto flex items-center justify-center text-white mb-8 shadow-lg shadow-accent/20">
          <TrendingUp size={36} />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight text-[#f0f6fc] uppercase">Nexus Portfolio</h1>
        <p className="text-text-secondary mb-10 font-medium">Professional grade asset command center.</p>
        
        <div className="space-y-4">
          <button 
            onClick={login}
            className="w-full flex items-center justify-center space-x-3 bg-[#f0f6fc] text-[#161b22] py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 contrast-125" alt="google" />
            <span>Authorize with Google</span>
          </button>

          <button 
            onClick={skipAuth}
            className="w-full flex items-center justify-center space-x-3 bg-accent text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg active:scale-95"
          >
            <LayoutDashboard size={20} />
            <span>Try Now (No Account Required)</span>
          </button>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border/50 text-left">
            <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Access Instructions</h4>
            <p className="text-[10px] text-text-secondary font-medium leading-relaxed">
              If Google login fails, use the <span className="text-[#f0f6fc]">"Try Now"</span> button to bypass domain restrictions and test the interface immediately.
            </p>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 font-bold text-text-secondary uppercase tracking-[0.3em] text-[10px]">Verifying Protocol</p>
      </div>
    </div>
  );
  
  return user ? <MainLayout /> : <LoginPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
