"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL =
  "/api/bot";

interface Holding {
  symbol: string;
  value: number;
  percentage: number;
}

interface Decision {
  timestamp: string;
  action: "BUY" | "SELL" | "HOLD";
  symbol: string;
  confidence: number;
  reason: string;
  portfolio_value?: number;
}

interface MarketCoin {
  symbol: string;
  price: number;
  change_24h: number;
  rsi?: number;
  macd_signal?: string;
}

interface PortfolioData {
  total_value: number;
  pnl: number;
  pnl_percent: number;
  holdings: Holding[];
  fear_greed_score?: number;
  top_opportunity?: { symbol: string; score: number };
}

interface Trade {
  timestamp: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  value: number;
}

interface DashboardData {
  portfolio: PortfolioData | null;
  decisions: Decision[];
  market: MarketCoin[];
  trades: Trade[];
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: "#2B3139" }}
    />
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, React.CSSProperties> = {
    BUY: {
      backgroundColor: "rgba(14,203,129,0.15)",
      color: "#0ECB81",
      border: "1px solid rgba(14,203,129,0.3)",
    },
    SELL: {
      backgroundColor: "rgba(246,70,93,0.15)",
      color: "#F6465D",
      border: "1px solid rgba(246,70,93,0.3)",
    },
    HOLD: {
      backgroundColor: "rgba(132,142,156,0.15)",
      color: "#848E9C",
      border: "1px solid rgba(132,142,156,0.3)",
    },
  };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={styles[action] || styles.HOLD}
    >
      {action}
    </span>
  );
}

function FearGreedBar({ score }: { score: number }) {
  const color =
    score < 25
      ? "#F6465D"
      : score < 40
      ? "#F97316"
      : score < 60
      ? "#F0B90B"
      : "#0ECB81";
  const label =
    score < 25
      ? "Extreme Fear"
      : score < 40
      ? "Fear"
      : score < 60
      ? "Neutral"
      : score < 80
      ? "Greed"
      : "Extreme Greed";

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs" style={{ color }}>
          {label}
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "#2B3139" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: "#848E9C" }}>
        out of 100
      </p>
    </div>
  );
}

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "#1E2329",
  border: "1px solid #2B3139",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    portfolio: null,
    decisions: [],
    market: [],
    trades: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchData = useCallback(async () => {
    const newData: Partial<DashboardData> = {};

    const results = await Promise.allSettled([
      fetch(`${API_URL}/portfolio`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/decisions`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/market`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/trades`).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (results[0].status === "fulfilled" && results[0].value)
      newData.portfolio = results[0].value;
    if (results[1].status === "fulfilled" && results[1].value)
      newData.decisions = results[1].value;
    if (results[2].status === "fulfilled" && results[2].value)
      newData.market = results[2].value;
    if (results[3].status === "fulfilled" && results[3].value)
      newData.trades = results[3].value;

    setData((prev) => ({ ...prev, ...newData }));
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(
          Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const chartData = data.decisions
    .filter(
      (d): d is Decision & { portfolio_value: number } =>
        d.portfolio_value !== undefined
    )
    .slice(-50)
    .map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: d.portfolio_value,
    }));

  const { portfolio, decisions, market, trades } = data;

  const topHoldings = (portfolio?.holdings ?? [])
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const TARGET_COINS = ["BTC", "ETH", "SOL", "BNB"];
  const marketCoins = TARGET_COINS.map(
    (sym) =>
      market.find((m) => m.symbol.replace("USDT", "") === sym || m.symbol === sym) ?? null
  );

  const fmt = (n: number, decimals = 2) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#0B0E11", color: "#EAECEF" }}
    >
      {/* ── Header ── */}
      <header
        className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{ backgroundColor: "#1E2329", borderBottom: "1px solid #2B3139" }}
      >
        <h1 className="text-xl font-bold" style={{ color: "#F0B90B" }}>
          Binance AI Bot
        </h1>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: "#0ECB81" }}
            />
            <span className="text-sm font-semibold" style={{ color: "#0ECB81" }}>
              RUNNING
            </span>
          </span>
          <span
            className="px-2.5 py-0.5 rounded text-xs font-bold"
            style={{
              backgroundColor: "rgba(240,185,11,0.15)",
              color: "#F0B90B",
              border: "1px solid rgba(240,185,11,0.4)",
            }}
          >
            TESTNET
          </span>
        </div>

        <span className="text-xs" style={{ color: "#848E9C" }}>
          {lastUpdated
            ? `Last updated ${secondsAgo}s ago`
            : "Connecting..."}
        </span>
      </header>

      <div className="p-4 sm:p-6 space-y-5">
        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Portfolio Value */}
          <div className="rounded-xl p-4" style={CARD_STYLE}>
            <p className="text-xs font-medium mb-2" style={{ color: "#848E9C" }}>
              Portfolio Value
            </p>
            {loading && !portfolio ? (
              <Skeleton className="h-8 w-36" />
            ) : (
              <p className="text-2xl font-bold" style={{ color: "#EAECEF" }}>
                ${fmt(portfolio?.total_value ?? 0)}
              </p>
            )}
          </div>

          {/* P&L */}
          <div className="rounded-xl p-4" style={CARD_STYLE}>
            <p className="text-xs font-medium mb-2" style={{ color: "#848E9C" }}>
              P&L
            </p>
            {loading && !portfolio ? (
              <>
                <Skeleton className="h-8 w-28 mb-1" />
                <Skeleton className="h-4 w-16" />
              </>
            ) : (
              <>
                <p
                  className="text-2xl font-bold"
                  style={{
                    color: (portfolio?.pnl ?? 0) >= 0 ? "#0ECB81" : "#F6465D",
                  }}
                >
                  {(portfolio?.pnl ?? 0) >= 0 ? "+" : "-"}$
                  {fmt(Math.abs(portfolio?.pnl ?? 0))}
                </p>
                <p
                  className="text-sm mt-0.5"
                  style={{
                    color:
                      (portfolio?.pnl_percent ?? 0) >= 0
                        ? "#0ECB81"
                        : "#F6465D",
                  }}
                >
                  {(portfolio?.pnl_percent ?? 0) >= 0 ? "+" : ""}
                  {(portfolio?.pnl_percent ?? 0).toFixed(2)}%
                </p>
              </>
            )}
          </div>

          {/* Fear & Greed */}
          <div className="rounded-xl p-4" style={CARD_STYLE}>
            <p className="text-xs font-medium mb-2" style={{ color: "#848E9C" }}>
              Fear & Greed Index
            </p>
            {loading && !portfolio ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full" />
              </>
            ) : (
              <FearGreedBar score={portfolio?.fear_greed_score ?? 50} />
            )}
          </div>

          {/* Top Opportunity */}
          <div className="rounded-xl p-4" style={CARD_STYLE}>
            <p className="text-xs font-medium mb-2" style={{ color: "#848E9C" }}>
              Top Opportunity
            </p>
            {loading && !portfolio ? (
              <>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-4 w-28" />
              </>
            ) : portfolio?.top_opportunity ? (
              <>
                <p className="text-2xl font-bold" style={{ color: "#F0B90B" }}>
                  {portfolio.top_opportunity.symbol}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#848E9C" }}>
                  Score: {portfolio.top_opportunity.score}/100
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "#848E9C" }}>
                —
              </p>
            )}
          </div>
        </div>

        {/* ── Chart + Holdings ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Portfolio Chart */}
          <div className="rounded-xl p-4 lg:col-span-2" style={CARD_STYLE}>
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: "#EAECEF" }}
            >
              Portfolio Value Over Time
            </h2>
            {loading && chartData.length === 0 ? (
              <Skeleton className="h-52 w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2B3139"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#848E9C", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#848E9C", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                    }
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E2329",
                      border: "1px solid #2B3139",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#848E9C" }}
                    itemStyle={{ color: "#F0B90B" }}
                    formatter={(v: unknown) => [
                      `$${Number(v).toLocaleString()}`,
                      "Portfolio",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#F0B90B"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#F0B90B" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div
                className="h-52 flex items-center justify-center"
                style={{ color: "#848E9C" }}
              >
                <p className="text-sm">No chart data yet — waiting for decisions</p>
              </div>
            )}
          </div>

          {/* Top Holdings */}
          <div className="rounded-xl p-4" style={CARD_STYLE}>
            <h2
              className="text-sm font-semibold mb-3"
              style={{ color: "#EAECEF" }}
            >
              Top Holdings
            </h2>
            {loading && topHoldings.length === 0 ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : topHoldings.length > 0 ? (
              <div>
                <div
                  className="grid grid-cols-3 text-xs pb-2 mb-1"
                  style={{
                    color: "#848E9C",
                    borderBottom: "1px solid #2B3139",
                  }}
                >
                  <span>Coin</span>
                  <span className="text-right">Value</span>
                  <span className="text-right">%</span>
                </div>
                {topHoldings.map((h, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 text-sm py-1.5"
                    style={{ borderBottom: "1px solid #2B313955" }}
                  >
                    <span
                      className="font-semibold"
                      style={{ color: "#F0B90B" }}
                    >
                      {h.symbol}
                    </span>
                    <span className="text-right" style={{ color: "#EAECEF" }}>
                      ${h.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-right" style={{ color: "#848E9C" }}>
                      {h.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#848E9C" }}>
                No holdings data
              </p>
            )}
          </div>
        </div>

        {/* ── Market Snapshot ── */}
        <div>
          <h2
            className="text-sm font-semibold mb-3"
            style={{ color: "#EAECEF" }}
          >
            Market Snapshot
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TARGET_COINS.map((symbol, i) => {
              const coin = marketCoins[i];
              return (
                <div
                  key={symbol}
                  className="rounded-xl p-4"
                  style={CARD_STYLE}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-base" style={{ color: "#F0B90B" }}>
                      {symbol}
                    </span>
                    {coin?.rsi !== undefined && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor:
                            coin.rsi < 30
                              ? "rgba(14,203,129,0.15)"
                              : coin.rsi > 70
                              ? "rgba(246,70,93,0.15)"
                              : "rgba(132,142,156,0.15)",
                          color:
                            coin.rsi < 30
                              ? "#0ECB81"
                              : coin.rsi > 70
                              ? "#F6465D"
                              : "#848E9C",
                        }}
                      >
                        RSI {coin.rsi.toFixed(0)}
                      </span>
                    )}
                  </div>
                  {loading && !coin ? (
                    <>
                      <Skeleton className="h-6 w-24 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </>
                  ) : coin ? (
                    <>
                      <p
                        className="text-lg font-semibold"
                        style={{ color: "#EAECEF" }}
                      >
                        $
                        {coin.price.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p
                        className="text-sm mt-0.5"
                        style={{
                          color: coin.change_24h >= 0 ? "#0ECB81" : "#F6465D",
                        }}
                      >
                        {coin.change_24h >= 0 ? "+" : ""}
                        {coin.change_24h.toFixed(2)}%
                      </p>
                      {coin.macd_signal && (
                        <p
                          className="text-xs mt-1.5"
                          style={{ color: "#848E9C" }}
                        >
                          MACD: {coin.macd_signal}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: "#848E9C" }}>
                      —
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Decisions Table ── */}
        <div className="rounded-xl p-4" style={CARD_STYLE}>
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "#EAECEF" }}
          >
            Recent Decisions
          </h2>
          {loading && decisions.length === 0 ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : decisions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2B3139" }}>
                    {["Time", "Action", "Coin", "Confidence", "Reason"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left pb-2 pr-4 text-xs font-medium"
                          style={{ color: "#848E9C" }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {decisions.slice(0, 20).map((d, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid #2B313966" }}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td
                        className="py-2.5 pr-4 text-xs whitespace-nowrap"
                        style={{ color: "#848E9C" }}
                      >
                        {new Date(d.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4">
                        <ActionBadge action={d.action} />
                      </td>
                      <td
                        className="py-2.5 pr-4 font-semibold"
                        style={{ color: "#F0B90B" }}
                      >
                        {d.symbol}
                      </td>
                      <td
                        className="py-2.5 pr-4 text-sm"
                        style={{ color: "#EAECEF" }}
                      >
                        {d.confidence}%
                      </td>
                      <td
                        className="py-2.5 text-xs"
                        style={{ color: "#848E9C" }}
                      >
                        {d.reason
                          ? d.reason.length > 60
                            ? d.reason.slice(0, 60) + "…"
                            : d.reason
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#848E9C" }}>
              No decisions recorded yet
            </p>
          )}
        </div>

        {/* ── Trades Section ── */}
        <div className="rounded-xl p-4" style={CARD_STYLE}>
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "#EAECEF" }}
          >
            Trades
          </h2>
          {trades.length === 0 ? (
            <div className="flex items-center gap-3 py-3">
              <span
                className="w-3 h-3 rounded-full animate-pulse flex-shrink-0"
                style={{ backgroundColor: "#0ECB81" }}
              />
              <span className="text-sm" style={{ color: "#848E9C" }}>
                Bot monitoring markets — no trades executed yet
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2B3139" }}>
                    {["Time", "Symbol", "Side", "Quantity", "Price", "Value"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left pb-2 pr-4 text-xs font-medium"
                          style={{ color: "#848E9C" }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid #2B313966" }}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td
                        className="py-2.5 pr-4 text-xs whitespace-nowrap"
                        style={{ color: "#848E9C" }}
                      >
                        {new Date(t.timestamp).toLocaleString()}
                      </td>
                      <td
                        className="py-2.5 pr-4 font-semibold"
                        style={{ color: "#F0B90B" }}
                      >
                        {t.symbol}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className="font-semibold text-sm"
                          style={{
                            color:
                              t.side === "BUY" ? "#0ECB81" : "#F6465D",
                          }}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td
                        className="py-2.5 pr-4"
                        style={{ color: "#EAECEF" }}
                      >
                        {t.quantity.toLocaleString()}
                      </td>
                      <td
                        className="py-2.5 pr-4"
                        style={{ color: "#EAECEF" }}
                      >
                        ${fmt(t.price)}
                      </td>
                      <td className="py-2.5" style={{ color: "#EAECEF" }}>
                        ${fmt(t.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-4 text-center text-xs"
        style={{
          borderTop: "1px solid #2B3139",
          color: "#848E9C",
        }}
      >
        Built by Rohit Nair | github.com/Rohitn96
      </footer>
    </div>
  );
}
