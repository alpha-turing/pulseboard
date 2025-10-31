'use client';

interface DataTimestampProps {
  timestamp: string;
  source?: string;
  degraded?: boolean;
  latencyMs?: number;
}

export default function DataTimestamp({
  timestamp,
  source = 'polygon.io',
  degraded = false,
  latencyMs,
}: DataTimestampProps) {
  // Format timestamp for IST (Asia/Kolkata)
  const date = new Date(timestamp);
  const formattedTime = date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>
        As of <span className="font-mono">{formattedTime} IST</span>
      </span>
      <span className="text-gray-600">•</span>
      <span>
        Source:{' '}
        <span className={degraded ? 'text-warning' : 'text-gray-300'}>
          {source}
        </span>
      </span>
      {degraded && (
        <>
          <span className="text-warning">⚠️ Degraded</span>
        </>
      )}
      {latencyMs !== undefined && (
        <>
          <span className="text-gray-600">•</span>
          <span className="font-mono">{latencyMs}ms</span>
        </>
      )}
    </div>
  );
}
