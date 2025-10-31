/**
 * WebSocket Connection Status Indicator
 * Shows whether real-time data connection is active
 */

'use client';

import { useWebSocketStatus } from '@/hooks/useRealtimePrice';

export default function WebSocketStatus() {
  const isConnected = useWebSocketStatus();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-success animate-pulse' : 'bg-gray-500'
        }`}
        title={isConnected ? 'Real-time data connected' : 'Real-time data disconnected'}
      />
      <span className="text-xs text-gray-400">
        {isConnected ? 'Live' : 'Delayed'}
      </span>
    </div>
  );
}
