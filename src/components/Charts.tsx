"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "#16161F",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#E8E8F2",
};

export function WeeklyBars({ data }: { data: { day: string; posts: number; likes: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="day" stroke="#6B6B85" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#6B6B85" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="posts" name="Proofs" fill="#7C5CFF" radius={[6, 6, 0, 0]} />
        <Bar dataKey="likes" name="Likes received" fill="#4ADE80" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendArea({ data }: { data: { week: string; posts: number; consistency: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="week" stroke="#6B6B85" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#6B6B85" fontSize={12} tickLine={false} axisLine={false} unit="%" width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="consistency" name="Consistency" stroke="#9D85FF" strokeWidth={2.5} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
