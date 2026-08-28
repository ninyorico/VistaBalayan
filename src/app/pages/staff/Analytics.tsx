import { TrendingUp, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const establishmentTrends = [
  { month: "Jan", visitors: 385, occupancy: 75 },
  { month: "Feb", visitors: 412, occupancy: 78 },
  { month: "Mar", visitors: 523, occupancy: 82 },
  { month: "Apr", visitors: 608, occupancy: 87 },
  { month: "May", visitors: 695, occupancy: 91 },
];

const performanceMetrics = [
  { metric: "Visitor Growth", value: 14, trend: "up" },
  { metric: "Occupancy Rate", value: 91, trend: "up" },
];

const monthlyData = [
  { month: "Jan", guests: 385, guestNights: 370 },
  { month: "Feb", guests: 412, guestNights: 395 },
  { month: "Mar", guests: 523, guestNights: 502 },
  { month: "Apr", guests: 608, guestNights: 583 },
  { month: "May", guests: 695, guestNights: 667 },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="vista-page-heading">
        <h1 className="vista-title">
          Establishment Analytics
        </h1>
        <p className="vista-subtitle">
          Track your establishment's performance and trends
        </p>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {performanceMetrics.map((metric, index) => (
          <div
            key={index}
            className="vista-card p-6"
          >
            <p className="text-sm text-gray-600 mb-1">{metric.metric}</p>
            <div className="flex items-center justify-between">
              <p className="vista-title">
                {metric.value}
                {metric.metric.includes("Rate") || metric.metric.includes("Visitors")
                  ? "%"
                  : metric.metric.includes("Satisfaction")
                  ? "/5"
                  : "%"}
              </p>
              <TrendingUp
                className={`w-6 h-6 ${
                  metric.trend === "up"
                    ? "text-green-600"
                    : metric.trend === "down"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Visitor & Occupancy Trends */}
      <div key="visitor-occupancy-card" className="vista-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#0E5A72]" />
          <h3 className="text-lg font-semibold text-gray-900">
            Visitor & Occupancy Trends
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={establishmentTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              key="visitors-line"
              yAxisId="left"
              type="monotone"
              dataKey="visitors"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Visitors"
            />
            <Line
              key="occupancy-line"
              yAxisId="right"
              type="monotone"
              dataKey="occupancy"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="Occupancy %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Guest Analysis */}
      <div key="monthly-performance-card" className="vista-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Monthly Guest Overview
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              key="guests-bar"
              dataKey="guests"
              fill="#3b82f6"
              name="Total Guests"
            />
            <Bar
              key="guest-nights-bar"
              dataKey="guestNights"
              fill="#8b5cf6"
              name="Guest Nights"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Insights */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
        <h4 className="font-semibold text-blue-900 mb-2">Best Performing Month</h4>
        <p className="text-3xl font-bold text-blue-900 mb-1">May 2026</p>
        <p className="text-sm text-[#0E5A72]">695 visitors, 91% occupancy</p>
      </div>
    </div>
  );
}
