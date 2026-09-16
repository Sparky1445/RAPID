import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Activity, Battery, ShieldAlert, CheckSquare } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { SkeletonStatTile, SkeletonChart } from '../components/shared/Skeleton';
import useThemeTokens from '../components/shared/useThemeTokens';

const TILE = 'bg-surface rounded-2xl p-5 border border-border';
const TILE_LABEL = 'text-[11px] font-mono text-muted uppercase font-semibold tracking-wide';
const TILE_VALUE = 'text-2xl font-bold text-text mt-2 tabular-nums';
const TILE_UNIT = 'text-xs text-muted font-normal';
const CHART_CARD = 'bg-surface rounded-2xl p-5 border border-border flex flex-col h-80';
const CHART_TITLE = 'font-bold text-xs uppercase tracking-wider text-text';

function Analytics() {
  // These defaults only need to be structurally valid. `loading` gates a
  // skeleton, so they are never rendered as real values.
  const [summary, setSummary] = useState({
    totalDrones: 0, activeDrones: 0, maintenanceDrones: 0, idleDrones: 0,
    activeIncidents: 0, resolvedIncidents: 0, totalIncidents: 0, averageBattery: 0
  });
  const [loading, setLoading] = useState(true);

  const [charts, setCharts] = useState({
    categories: [],
    dailyTrends: [],
    droneUsage: []
  });

  const t = useThemeTokens();
  const axis = { stroke: t.muted, fontSize: 11 };
  const tooltipStyle = {
    backgroundColor: t.surface,
    borderColor: t.borderStrong,
    color: t.text,
    borderRadius: 12,
    fontSize: 12,
  };

  useEffect(() => {
    let ignore = false;

    const fetchMetrics = async () => {
      try {
        const summaryRes = await fetch('/api/metrics/summary');
        const chartRes = await fetch('/api/metrics/historical');

        if (ignore) return;
        if (summaryRes.ok && chartRes.ok) {
          const summaryData = await summaryRes.json();
          const chartData = await chartRes.json();
          if (ignore) return;
          setSummary(summaryData);
          setCharts(chartData);
        }
      } catch (err) {
        if (!ignore) console.error(err);
      } finally {
        // Only the FIRST resolution (success or failure) should end the
        // loading state - later 3s poll ticks must not flash the skeleton
        // back over already-displayed real data.
        if (!ignore) setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => { ignore = true; clearInterval(interval); };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="bg-accent/10 p-2.5 rounded-xl border border-accent/30">
          <BarChart3 className="h-6 w-6 text-accent" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-wide text-text">Fleet analytics</h2>
          <p className="text-xs text-muted font-mono mt-0.5">How busy the fleet is, how fast calls are answered, and how the batteries are holding up.</p>
        </div>
      </div>

      {/* Overview stats cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <SkeletonStatTile key={i} />)}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={TILE}>
          <div className="flex items-center justify-between gap-2">
            <span className={TILE_LABEL}>Drones in flight</span>
            <Activity className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />
          </div>
          <p className={TILE_VALUE}>
            {summary.activeDrones} <span className={TILE_UNIT}>of {summary.totalDrones}</span>
          </p>
        </div>

        <div className={TILE}>
          <div className="flex items-center justify-between gap-2">
            <span className={TILE_LABEL}>Open emergencies</span>
            <ShieldAlert className={`h-4 w-4 flex-shrink-0 ${summary.activeIncidents > 0 ? 'text-status-urgent' : 'text-muted'}`} aria-hidden="true" />
          </div>
          <p className={TILE_VALUE}>
            {summary.activeIncidents} <span className={TILE_UNIT}>awaiting a drone</span>
          </p>
        </div>

        <div className={TILE}>
          <div className="flex items-center justify-between gap-2">
            <span className={TILE_LABEL}>Average battery</span>
            <Battery className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />
          </div>
          <p className={TILE_VALUE}>
            {summary.averageBattery}% <span className={TILE_UNIT}>across the fleet</span>
          </p>
        </div>

        <div className={TILE}>
          <div className="flex items-center justify-between gap-2">
            <span className={TILE_LABEL}>Cases closed</span>
            <CheckSquare className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />
          </div>
          <p className={TILE_VALUE}>
            {summary.resolvedIncidents} <span className={TILE_UNIT}>all time</span>
          </p>
        </div>
      </div>
      )}

      {/* Charts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart />
          <div className="lg:col-span-2"><SkeletonChart /></div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Incident alarm trends (Line chart) */}
        <div className={CHART_CARD}>
          <div className="flex items-center gap-2 mb-4">
            <LineIcon className="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 className={CHART_TITLE}>Calls per day</h3>
          </div>
          <div className="flex-1 min-h-0 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.dailyTrends} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="day" {...axis} />
                <YAxis allowDecimals={false} {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: t.borderStrong }} />
                <Line type="monotone" dataKey="count" name="Calls" stroke={t.accent} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories ratio breakdown (Pie Chart) */}
        <div className={CHART_CARD}>
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 className={CHART_TITLE}>What people call about</h3>
          </div>
          <div className="flex-1 min-h-0 text-xs flex items-center justify-center">
            {charts.categories.length > 0 ? (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-around gap-3">
                <div className="w-40 h-40 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {charts.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={t.chart?.[index % 7]} stroke={t.surface} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* The legend is the second channel. Adjacent hues in the
                    chart palette sit only ~1.2:1 apart, so the slice is
                    never identified by colour alone. */}
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-mono text-muted max-w-[220px]">
                  {charts.categories.map((entry, index) => (
                    <li key={entry.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: t.chart?.[index % 7] }}
                        aria-hidden="true"
                      ></span>
                      <span className="truncate">{entry.name} <b className="text-text tabular-nums">{entry.value}</b></span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted">No calls logged yet.</p>
            )}
          </div>
        </div>

        {/* Drone reserve levels (Bar Chart) */}
        <div className={`${CHART_CARD} lg:col-span-2`}>
          <div className="flex items-center gap-2 mb-4">
            <Battery className="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 className={CHART_TITLE}>Battery by drone</h3>
          </div>
          <div className="flex-1 min-h-0 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.droneUsage} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                <XAxis dataKey="name" {...axis} />
                <YAxis domain={[0, 100]} {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: t.border }} />
                <Bar dataKey="battery" name="Battery %" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {charts.droneUsage.map((entry, index) => {
                    // Same thresholds the fleet cards use, same tokens.
                    const color = entry.battery < 25 ? t.critical : entry.battery < 60 ? t.warning : t.normal;
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
      )}
    </div>
  );
}

export default Analytics;
