import React from 'react';
import { motion } from 'motion/react';
import { Activity, Gauge, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface QueueEfficiencyGaugeProps {
  waitTimeMinutes: number;
  avgConsultMinutes: number;
  waitingCount: number;
  totalServedToday: number;
  className?: string;
}

export const QueueEfficiencyGauge: React.FC<QueueEfficiencyGaugeProps> = ({
  waitTimeMinutes,
  avgConsultMinutes = 10,
  waitingCount,
  totalServedToday,
  className = ''
}) => {
  // 1. Calculate Efficiency Score (0 to 100)
  // Optimal ratio: expected wait vs consult time
  // If wait time is close to optimal consult time and queue is moving smoothly, efficiency is near 95-100%
  // As wait time balloons beyond consult time * waiting count, efficiency drops
  const expectedOptimalWait = Math.max(5, avgConsultMinutes);
  const actualRatio = waitTimeMinutes / expectedOptimalWait;

  let score = 92;
  if (waitingCount === 0) {
    score = 98;
  } else if (actualRatio <= 1.2) {
    score = Math.max(82, Math.round(98 - (actualRatio - 1) * 20));
  } else if (actualRatio <= 2.2) {
    score = Math.max(55, Math.round(82 - (actualRatio - 1.2) * 25));
  } else {
    score = Math.max(15, Math.round(55 - (actualRatio - 2.2) * 15));
  }

  // Throughput (Patients / Hour)
  const estimatedThroughputPerHour = avgConsultMinutes > 0 ? Math.round(60 / avgConsultMinutes) : 6;

  // Determine Zone Threshold: Green (>= 80), Yellow (55 - 79), Red (< 55)
  let statusColor = '#10b981'; // Green
  let statusText = 'كفاءة ممتازة • تدفق سلس';
  let statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let zone = 'green';

  if (score < 55) {
    statusColor = '#ef4444'; // Red
    statusText = 'ضغط انتظار مرتفع • يوصى بالتسريع';
    statusBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    zone = 'red';
  } else if (score < 80) {
    statusColor = '#f59e0b'; // Yellow
    statusText = 'كثافة معتدلة • طابور متوازن';
    statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    zone = 'yellow';
  }

  // Needle angle: from -90 deg (score 0) to +90 deg (score 100)
  // Mapping: 0 -> -90 deg, 50 -> 0 deg, 100 -> +90 deg
  const needleAngle = -90 + (score / 100) * 180;

  return (
    <div className={`p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden ${className}`}>
      {/* Background ambient lighting coupled with gauge color */}
      <div 
        className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: statusColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>مؤشر كفاءة الطابور وسرعة الإنجاز</span>
              <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                Queue Efficiency Gauge
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              مقارنة وقت انتظار المرضى الفعلي مقابل معدل استيعاب العيادة
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm ${statusBg}`}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
          <span>{statusText}</span>
        </span>
      </div>

      {/* Gauge Visual & Needle Display */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-5 pb-2 relative z-10">
        {/* Semi-Circle SVG Gauge */}
        <div className="relative w-64 h-36 flex items-end justify-center">
          <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
            <defs>
              {/* Green Gradient */}
              <linearGradient id="gaugeGreenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              {/* Yellow Gradient */}
              <linearGradient id="gaugeYellowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              {/* Red Gradient */}
              <linearGradient id="gaugeRedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#1e293b"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Red Zone (0 - 50%) */}
            <path
              d="M 20 100 A 80 80 0 0 1 82 28"
              fill="none"
              stroke="url(#gaugeRedGrad)"
              strokeWidth="14"
              strokeDasharray="251"
              strokeDashoffset={251 - (251 * 0.38)}
              strokeLinecap="round"
              opacity={zone === 'red' ? 1 : 0.45}
            />

            {/* Yellow Zone (50 - 79%) */}
            <path
              d="M 83 27 A 80 80 0 0 1 138 38"
              fill="none"
              stroke="url(#gaugeYellowGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              opacity={zone === 'yellow' ? 1 : 0.45}
            />

            {/* Green Zone (80 - 100%) */}
            <path
              d="M 139 39 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeGreenGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              opacity={zone === 'green' ? 1 : 0.45}
            />

            {/* Pivot Needle Indicator */}
            <g transform={`translate(100, 100) rotate(${needleAngle})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-68"
                stroke={statusColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                className="transition-all duration-700 ease-out drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              />
              <circle cx="0" cy="0" r="7" fill="#ffffff" />
              <circle cx="0" cy="0" r="4" fill={statusColor} />
            </g>

            {/* Threshold Label Marks */}
            <text x="18" y="112" fill="#ef4444" fontSize="9" fontWeight="bold">0%</text>
            <text x="94" y="16" fill="#f59e0b" fontSize="9" fontWeight="bold">50%</text>
            <text x="170" y="112" fill="#10b981" fontSize="9" fontWeight="bold">100%</text>
          </svg>

          {/* Centered Score Badge */}
          <div className="absolute bottom-0 flex flex-col items-center">
            <span className="text-3xl font-black font-mono tracking-tight text-white drop-shadow-md">
              {score}%
            </span>
            <span className="text-[10px] font-bold text-slate-400 -mt-0.5">
              مؤشر الكفاءة
            </span>
          </div>
        </div>

        {/* Real-time Metric Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto flex-1 text-start">
          {/* Average Wait Time */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>وقت الانتظار الفعلي</span>
            </div>
            <div className="text-xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{waitTimeMinutes}</span>
              <span className="text-xs text-slate-400 font-normal">دقيقة</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              الهدف: ~{avgConsultMinutes} دقيقة لكل مريض
            </span>
          </div>

          {/* Clinic Throughput */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>معدل تدفق الحالات</span>
            </div>
            <div className="text-xl font-black font-mono text-cyan-400 flex items-baseline gap-1">
              <span>~{estimatedThroughputPerHour}</span>
              <span className="text-xs text-slate-400 font-normal">مرضى/ساعة</span>
            </div>
            <span className="text-[10px] text-emerald-400/90 block mt-0.5">
              أنجز اليوم: {totalServedToday} حالة
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
