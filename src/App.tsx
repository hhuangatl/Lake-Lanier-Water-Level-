/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  History as HistoryIcon, 
  Info, 
  LayoutDashboard, 
  LogOut, 
  Map as MapIcon, 
  MapPin, 
  Navigation, 
  Search, 
  Settings as SettingsIcon, 
  Thermometer, 
  TrendingUp, 
  Waves,
  Download,
  Plus,
  Minus,
  Locate,
  Loader2,
  User,
  Shield,
  Lock,
  Mail
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fetchLakeData, fetchHistoricalData, fetchRecentReadings, LakeData, RecentReading } from './services/lakeService';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Tab = 'dashboard' | 'history' | 'map' | 'settings';
type UnitSystem = 'imperial' | 'metric';

interface Reading {
  date: string;
  high: number;
  low: number;
  rain: number;
}

// --- Components ---

const Dashboard = ({ data, chartData, unitSystem }: { data: LakeData | null, chartData: any[], unitSystem: UnitSystem }) => {
  const fullPool = 1071.00;
  
  const convertLevel = (val: number) => unitSystem === 'metric' ? val * 0.3048 : val;
  const convertTemp = (val: number) => unitSystem === 'metric' ? (val - 32) * 5/9 : val;
  const unitLabel = unitSystem === 'metric' ? 'm' : 'ft';
  const tempUnit = unitSystem === 'metric' ? 'C' : 'F';

  const waterLevel = data ? convertLevel(data.waterLevel) : 0;
  const convertedFullPool = convertLevel(fullPool);
  const diff = data ? (waterLevel - convertedFullPool).toFixed(2) : '0.00';
  const isAbove = data ? data.waterLevel > fullPool : false;

  if (!data) return null;

  const convertedChartData = chartData.map(d => ({ ...d, level: convertLevel(d.level) }));

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-500 to-sky-700 p-8 text-white shadow-xl shadow-sky-200">
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <Waves size={240} strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-sky-200/80">
            {new Date(data.dateTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-sm font-semibold text-sky-100">Current Water Level</p>
          <div className="mt-1 flex items-baseline gap-2">
            <h2 className={cn(
              "text-6xl font-extrabold tracking-tight transition-colors duration-500",
              isAbove ? "text-emerald-300" : "text-rose-300"
            )}>
              {waterLevel.toFixed(2)}
            </h2>
            <span className="text-xl font-medium text-sky-100">{unitLabel}</span>
          </div>
          <div className={cn(
            "mt-6 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium backdrop-blur-sm transition-colors duration-500",
            isAbove ? "bg-emerald-500/30 text-emerald-50" : "bg-rose-500/30 text-rose-50"
          )}>
            <TrendingUp size={16} className={cn("mr-1.5", !isAbove && "rotate-180")} />
            {Math.abs(parseFloat(diff))} {unitLabel} {isAbove ? 'Above' : 'Below'} Full Pool
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-500">
              <Waves size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Water Temp</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {data.waterTemp !== null ? `${convertTemp(data.waterTemp).toFixed(1)}°` : '--'}
            <span className="ml-1 text-sm font-normal text-slate-400">{tempUnit}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
              <Thermometer size={20} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Air Temp</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {data.airTemp !== null ? `${convertTemp(data.airTemp).toFixed(1)}°` : '--'}
            <span className="ml-1 text-sm font-normal text-slate-400">{tempUnit}</span>
          </p>
        </div>
      </div>

      {/* Trend Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Last 24 Hours</h3>
          {convertedChartData.length > 1 && (
            <span className={cn(
              "rounded px-2 py-1 text-[10px] font-semibold",
              convertedChartData[convertedChartData.length-1].level >= convertedChartData[0].level ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            )}>
              {(convertedChartData[convertedChartData.length-1].level - convertedChartData[0].level).toFixed(2)} {unitLabel} total
            </span>
          )}
        </div>
        
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={convertedChartData}>
              <defs>
                <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                labelStyle={{ fontWeight: 'bold' }}
                formatter={(value: number) => [`${value.toFixed(2)} ${unitLabel}`, 'Level']}
              />
              <Area 
                type="monotone" 
                dataKey="level" 
                stroke="#0ea5e9" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorLevel)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Last Reading</span>
            <span className="font-semibold text-slate-800">{new Date(data.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="border-t border-slate-50 pt-3 flex justify-between text-sm">
            <span className="text-slate-500">Full Pool Level</span>
            <span className="font-semibold text-slate-800">{convertedFullPool.toFixed(2)} {unitLabel}</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex gap-3 rounded-2xl bg-sky-50 p-4">
        <Info size={20} className="mt-0.5 flex-shrink-0 text-sky-500" />
        <p className="text-sm leading-relaxed text-sky-800">
          The lake level has remained stable over the last 48 hours with minimal dam release. Expect levels to hold steady through the weekend.
        </p>
      </div>
    </div>
  );
};

const HistoryView = ({ data, onAction, unitSystem }: { data: LakeData | null, onAction: (msg: string) => void, unitSystem: UnitSystem }) => {
  const [period, setPeriod] = useState<'1M' | '6M' | '1Y'>('1M');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [recentReadings, setRecentReadings] = useState<RecentReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [readingsCount, setReadingsCount] = useState(7);
  const [hasMore, setHasMore] = useState(true);

  const convertLevel = (val: number) => unitSystem === 'metric' ? val * 0.3048 : val;
  const convertRain = (val: number) => unitSystem === 'metric' ? val * 25.4 : val;
  const unitLabel = unitSystem === 'metric' ? 'm' : 'ft';
  const rainUnit = unitSystem === 'metric' ? 'mm' : 'in';

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const days = period === '1M' ? 30 : period === '6M' ? 180 : 365;
      const history = await fetchHistoricalData(days);
      setHistoryData(history.map(d => ({ ...d, level: convertLevel(d.level) })));
      setLoading(false);
    }
    loadHistory();
  }, [period, unitSystem]);

  useEffect(() => {
    async function loadRecentReadings() {
      setTableLoading(true);
      const readings = await fetchRecentReadings(readingsCount);
      setRecentReadings(readings.map(r => ({
        ...r,
        high: convertLevel(r.high),
        low: convertLevel(r.low),
        lastLevel: convertLevel(r.lastLevel),
        rain: convertRain(r.rain)
      })));
      // If we got fewer readings than requested, there's no more to load
      if (readings.length < readingsCount) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      setTableLoading(false);
    }
    loadRecentReadings();
  }, [readingsCount, unitSystem]);

  const handleLoadMore = () => {
    setReadingsCount(prev => prev + 7);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Water Levels ({unitLabel})</h2>
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
            {(['1M', '6M', '1Y'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  period === p ? "bg-white text-sky-600 shadow-sm" : "text-gray-500 hover:text-sky-600"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        
        <div className="relative h-64 w-full">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
              />
              <YAxis 
                domain={['dataMin - 0.1', 'dataMax + 0.1']} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate || label;
                  }
                  return label;
                }}
                formatter={(value: number) => [`${value.toFixed(2)} ${unitLabel}`, 'Level']}
              />
              <Line 
                type="monotone" 
                dataKey="level" 
                stroke="#0077be" 
                strokeWidth={period === '1Y' ? 1.5 : 3} 
                dot={period === '1M' ? { r: 3, fill: '#fff', strokeWidth: 2, stroke: '#0077be' } : false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex justify-between text-sm text-gray-500">
          <p>Current Level: <span className="font-bold text-sky-600">{data ? convertLevel(data.waterLevel).toFixed(2) : '--'} {unitLabel}</span></p>
          <p>Full Pool: {convertLevel(1071.00).toFixed(2)} {unitLabel}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Readings</h2>
          <button 
            onClick={() => onAction('History exported to CSV')}
            className="flex items-center text-sm font-medium text-sky-600 active:scale-95"
          >
            Export CSV
            <Download size={16} className="ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-sky-50 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">End of Day ({unitLabel})</th>
                <th className="px-4 py-3">High ({unitLabel})</th>
                <th className="px-4 py-3">Low ({unitLabel})</th>
                <th className="px-4 py-3">Rain ({rainUnit})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-500" />
                    <p className="mt-2 text-xs text-gray-400">Loading recent readings...</p>
                  </td>
                </tr>
              ) : recentReadings.length > 0 ? (
                recentReadings.map((reading, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-medium">{reading.date}</td>
                    <td className="px-4 py-4 font-bold text-sky-700">{reading.lastLevel > 0 ? reading.lastLevel.toFixed(2) : '--'}</td>
                    <td className="px-4 py-4">{reading.high > 0 ? reading.high.toFixed(2) : '--'}</td>
                    <td className="px-4 py-4">{reading.low > 0 ? reading.low.toFixed(2) : '--'}</td>
                    <td className="px-4 py-4">{reading.rain > 0 ? reading.rain.toFixed(2) : '0.00'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No recent data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 p-4 text-center">
          {hasMore ? (
            <button 
              onClick={handleLoadMore}
              disabled={tableLoading}
              className="flex w-full items-center justify-center text-sm font-semibold text-sky-600 disabled:opacity-50"
            >
              {tableLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Load More History
            </button>
          ) : (
            <p className="text-sm text-gray-400">No more history available</p>
          )}
        </div>
      </div>
    </div>
  );
};

const MapView = () => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const locations = {
    'holiday': {
      id: 'holiday',
      title: 'Holiday Marina',
      subtitle: 'Full Service Marina',
      details: 'Open 24/7 • Wet Slips • Fuel Dock • Boat Rentals',
      stat: 'Fuel Price: $4.85/gal',
      top: '25%',
      left: '33%',
      color: 'bg-amber-500'
    },
    'dam': {
      id: 'dam',
      title: 'Buford Dam Station',
      subtitle: 'Water Level Measurement',
      details: 'USACE Real-time Data • Flow rate monitored',
      stat: 'Current Level: 1070.45 ft',
      top: '75%',
      left: '75%',
      color: 'bg-rose-500'
    },
    'bald-ridge': {
      id: 'bald-ridge',
      title: 'Bald Ridge Creek',
      subtitle: 'Public Boat Ramp',
      details: 'Double Ramp • Day Use Area • Parking Available',
      stat: 'Condition: Accessible',
      top: '50%',
      left: '66%',
      color: 'bg-emerald-500'
    }
  };

  return (
    <div className="relative h-[calc(100vh-140px)] w-full overflow-hidden rounded-3xl bg-slate-200">
      {/* Map Background */}
      <img 
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCN2EzJ3CpR1H97EZdCumg1OhnzgLlKcsibXp_v5mekG4lYdTUzzrwn9n3XJCqfq5-Ds5p7DMQ4LePqryvEI2TQ8-aX79ocbyDDnGVtHNQ3tb-pzUsX2saSLx-AbnXWceELKlLJDqVohYSqud5ehGoO58A7YdTj6o7NCN7lnaiyrVLjJr2NXkMY7Kr65j-mtMlv6aKbdUSqrGwCa8fNenGoAljuNVFnJ9Ab58kS87kUzzv5XrXvjNaZmHkd1_-ED_ym5gnFUpGuET2z" 
        alt="Lake Lanier Map"
        className="h-full w-full object-cover opacity-80"
        referrerPolicy="no-referrer"
      />

      {/* Search Bar Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="mx-auto max-w-md">
          <div className="flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 shadow-lg">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search marinas, ramps, or points..." 
              className="ml-2 w-full border-none p-0 text-sm focus:ring-0"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { label: 'Marinas', color: 'bg-amber-500' },
              { label: 'Boat Ramps', color: 'bg-emerald-500' },
              { label: 'Water Stations', color: 'bg-rose-500' }
            ].map((filter) => (
              <button key={filter.label} className="flex items-center whitespace-nowrap rounded-full border border-gray-100 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
                <span className={cn("mr-2 h-2 w-2 rounded-full", filter.color)}></span>
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Markers */}
      {Object.values(locations).map((loc) => (
        <div 
          key={loc.id}
          className="group absolute cursor-pointer transition-transform hover:scale-110"
          style={{ top: loc.top, left: loc.left, transform: 'translate(-50%, -50%)' }}
          onClick={() => setSelectedLocation(loc.id)}
        >
          <div className={cn("rounded-full border-2 border-white p-1.5 text-white shadow-lg", loc.color)}>
            <MapPin size={20} fill="currentColor" />
          </div>
          <span className="mt-1 block rounded bg-white px-2 py-0.5 text-center text-[10px] font-bold shadow-sm">
            {loc.title.split(' ')[0]}
          </span>
        </div>
      ))}

      {/* Map Controls */}
      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-lg active:bg-gray-100">
          <Plus size={20} />
        </button>
        <button className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-lg active:bg-gray-100">
          <Minus size={20} />
        </button>
        <button className="mt-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-lg active:bg-gray-100">
          <Locate size={20} className="text-sky-600" />
        </button>
      </div>

      {/* Bottom Sheet */}
      {selectedLocation && (
        <div className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-6 shadow-2xl transition-transform">
          <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-300"></div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{locations[selectedLocation as keyof typeof locations].title}</h3>
            <p className="font-semibold text-sky-600">{locations[selectedLocation as keyof typeof locations].subtitle}</p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{locations[selectedLocation as keyof typeof locations].details}</p>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Current Metric</span>
              <p className="text-lg font-bold text-blue-900">{locations[selectedLocation as keyof typeof locations].stat}</p>
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <button className="flex-1 rounded-xl bg-sky-600 py-3 font-bold text-white shadow-lg">Get Directions</button>
            <button 
              className="rounded-xl border border-gray-200 px-6 py-3 font-bold text-gray-600"
              onClick={() => setSelectedLocation(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ onAction, unitSystem, setUnitSystem }: { onAction: (msg: string) => void, unitSystem: UnitSystem, setUnitSystem: (u: UnitSystem) => void }) => {
  return (
    <div className="space-y-8 pb-24">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <User size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">Profile Information</h2>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
              <User size={32} />
            </div>
            <div>
              <p className="font-bold text-slate-800">Lake Lanier Explorer</p>
              <p className="text-sm text-slate-500">explorer@lakelanier.app</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Display Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" defaultValue="Lake Lanier Explorer" className="w-full rounded-xl border-slate-200 pl-10 focus:border-sky-500 focus:ring-sky-500" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" defaultValue="explorer@lakelanier.app" className="w-full rounded-xl border-slate-200 pl-10 focus:border-sky-500 focus:ring-sky-500" />
              </div>
            </div>
          </div>
          <button 
            onClick={() => onAction('Profile updated successfully')}
            className="mt-6 w-full rounded-xl bg-sky-600 py-3 font-semibold text-white shadow-sm transition-transform active:scale-95"
          >
            Update Profile
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Bell size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">Water Level Alerts</h2>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm text-slate-500">Get notified when the lake reaches specific thresholds.</p>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Drop Below Threshold</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="1068" className="w-20 rounded-lg border-slate-300 text-right focus:border-sky-500 focus:ring-sky-500" />
                <span className="text-sm text-slate-400">{unitSystem === 'metric' ? 'm' : 'ft'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Rise Above Threshold</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="1071" className="w-20 rounded-lg border-slate-300 text-right focus:border-sky-500 focus:ring-sky-500" />
                <span className="text-sm text-slate-400">{unitSystem === 'metric' ? 'm' : 'ft'}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => onAction('Alert thresholds saved')}
            className="mt-6 w-full rounded-xl bg-sky-600 py-3 font-semibold text-white shadow-sm transition-transform active:scale-95"
          >
            Save Thresholds
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="px-1 text-lg font-semibold text-slate-800">Notification Preferences</h2>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
          {[
            { label: 'Daily Summary', sub: 'Morning update on lake status', checked: true },
            { label: 'Weather Warnings', sub: 'High wind and storm alerts', checked: true },
            { label: 'Ramp Closures', sub: 'Alerts when public ramps open/close', checked: false }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{item.sub}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked={item.checked} className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="px-1 text-lg font-semibold text-slate-800">App Preferences</h2>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <label className="mb-3 block text-sm font-medium text-slate-700">Measurement Units</label>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button 
              onClick={() => {
                setUnitSystem('imperial');
                onAction('Units set to Imperial');
              }}
              className={cn(
                "rounded-md py-2 px-4 text-sm font-medium transition-all",
                unitSystem === 'imperial' ? "bg-white text-sky-600 shadow-sm" : "text-slate-600 hover:text-sky-600"
              )}
            >
              Imperial (ft)
            </button>
            <button 
              onClick={() => {
                setUnitSystem('metric');
                onAction('Units set to Metric');
              }}
              className={cn(
                "rounded-md py-2 px-4 text-sm font-medium transition-all",
                unitSystem === 'metric' ? "bg-white text-sky-600 shadow-sm" : "text-slate-600 hover:text-sky-600"
              )}
            >
              Metric (m)
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Shield size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">Privacy Settings</h2>
        </div>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
          {[
            { label: 'Location Sharing', sub: 'Allow app to use your GPS for map features', checked: true, icon: MapPin },
            { label: 'Data Analytics', sub: 'Help us improve by sharing anonymous usage data', checked: true, icon: Info },
            { label: 'Public Profile', sub: 'Make your profile visible to other users', checked: false, icon: User }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-50 p-2 text-slate-400">
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.sub}</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked={item.checked} className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
              </label>
            </div>
          ))}
          <div className="p-4">
            <button 
              onClick={() => onAction('Privacy settings updated')}
              className="flex items-center gap-2 text-sm font-semibold text-sky-600"
            >
              <Lock size={16} />
              Manage Advanced Privacy
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="px-1 text-lg font-semibold text-slate-800">Account</h2>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <button 
            onClick={() => onAction('Profile settings coming soon')}
            className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50"
          >
            <span className="font-medium text-slate-700">Profile Information</span>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
          <button 
            onClick={() => onAction('Privacy settings coming soon')}
            className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50"
          >
            <span className="font-medium text-slate-700">Privacy Settings</span>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
          <button 
            onClick={() => onAction('Signed out successfully')}
            className="flex w-full items-center justify-between p-4 font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Sign Out
            <LogOut size={18} />
          </button>
        </div>
      </section>

      <footer className="space-y-2 py-6 text-center text-xs text-slate-400">
        <p>Lake Lanier App v2.4.0</p>
        <div className="flex justify-center gap-4 underline">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [lakeData, setLakeData] = useState<LakeData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [data, history] = await Promise.all([
          fetchLakeData(),
          fetchHistoricalData(1)
        ]);
        setLakeData(data);
        setChartData(history);
        setError(null);
      } catch (err) {
        setError('Failed to load real-time lake data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 text-slate-400">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
          <p className="font-medium">Fetching real-time USGS data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 p-6 text-center">
          <div className="rounded-full bg-rose-50 p-4 text-rose-500">
            <Info size={32} />
          </div>
          <p className="text-slate-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="rounded-xl bg-sky-600 px-6 py-2 font-bold text-white shadow-lg active:scale-95"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard data={lakeData} chartData={chartData} unitSystem={unitSystem} />;
      case 'history': return <HistoryView data={lakeData} onAction={showToast} unitSystem={unitSystem} />;
      case 'map': return <MapView />;
      case 'settings': return <SettingsView onAction={showToast} unitSystem={unitSystem} setUnitSystem={setUnitSystem} />;
      default: return <Dashboard data={lakeData} chartData={chartData} unitSystem={unitSystem} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Lake Lanier';
      case 'history': return 'Historical Data';
      case 'map': return 'Map Explorer';
      case 'settings': return 'Alerts & Settings';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-3">
            {activeTab !== 'dashboard' && (
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="rounded-full p-1 hover:bg-slate-100"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800">{getTitle()}</h1>
              {activeTab === 'dashboard' && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Buford Dam Station</p>
              )}
            </div>
          </div>
          <div className="relative">
            <button 
              onClick={() => setActiveTab('settings')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600 transition-transform active:scale-90 hover:bg-sky-100"
              title="Alerts & Settings"
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-md p-4">
        {renderContent()}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 animate-bounce">
          <div className="rounded-full bg-slate-800 px-6 py-2 text-sm font-medium text-white shadow-2xl">
            {toast}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/90 p-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md justify-around">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'history', label: 'History', icon: HistoryIcon },
            { id: 'map', label: 'Map', icon: MapIcon },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-200",
                activeTab === tab.id ? "text-sky-600 scale-110" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
