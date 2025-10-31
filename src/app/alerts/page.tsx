'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Alert {
  id: string;
  ticker: string;
  alertType: string;
  condition: string;
  threshold: number;
  isActive: boolean;
  deliveryTarget: string;
  createdAt: string;
}

export default function AlertsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    ticker: '',
    alertType: 'price',
    condition: 'above',
    threshold: 0,
  });

  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      // TODO: Implement actual API endpoint
      return [];
    },
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (data: any) => {
      // TODO: Implement actual API endpoint
      console.log('Creating alert:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setShowCreateForm(false);
      setFormData({ ticker: '', alertType: 'price', condition: 'above', threshold: 0 });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAlertMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-gray-400 mt-1">Monitor price movements and market events</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ Create Alert'}
        </button>
      </div>

      {/* Create Alert Form */}
      {showCreateForm && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Create New Alert</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Alert Type
                </label>
                <select
                  value={formData.alertType}
                  onChange={(e) => setFormData({ ...formData, alertType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="price">Price</option>
                  <option value="percent_move">Percent Move</option>
                  <option value="volume_spike">Volume Spike</option>
                  <option value="options_oi">Options OI Change</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                  <option value="change">Change by</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                  placeholder="150.00"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createAlertMutation.isPending}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}
            </button>
          </form>
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Active Alerts</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-800 rounded skeleton" />
            ))}
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert: Alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
              >
                <div>
                  <div className="font-semibold text-white">{alert.ticker}</div>
                  <div className="text-sm text-gray-400">
                    {alert.alertType} {alert.condition} {alert.threshold}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    alert.isActive ? 'bg-success/20 text-success' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {alert.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button className="text-danger hover:text-danger/80">Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-4">🔔</div>
            <p className="text-lg mb-2">No alerts yet</p>
            <p className="text-sm">Create your first alert to get notified of market movements</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-primary-900/20 border border-primary-500/30 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-2">📋 Alert Engine - Coming Soon</h3>
        <p className="text-gray-400 text-sm">
          V1 includes alert creation and storage. The trigger engine and webhook delivery 
          will be implemented in V2. For now, alerts are stored but not actively monitored.
        </p>
      </div>
    </div>
  );
}
