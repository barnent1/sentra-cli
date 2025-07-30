/**
 * System Metrics Panel Component
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { SystemMetrics } from '../../../types';

interface MetricsPanelProps {
  metrics?: SystemMetrics;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Prepare agent utilization data for chart
  const agentData = Object.entries(metrics.agentUtilization).map(([persona, utilization]) => ({
    name: persona.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    shortName: persona.split('-').map(word => word.charAt(0).toUpperCase()).join(''),
    utilization: Math.round(utilization),
    color: utilization > 80 ? '#ef4444' : utilization > 50 ? '#f59e0b' : '#10b981'
  }));

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">System Metrics</h3>
      </div>

      <div className="p-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Tasks Completed */}
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tasks Completed</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.tasksCompleted}</p>
            </div>
          </div>

          {/* Average Completion Time */}
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Completion</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(metrics.averageCompletionTime)}
              </p>
            </div>
          </div>

          {/* Success Rate */}
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.successRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Context Efficiency */}
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${
              metrics.contextEfficiency > 60 ? 'bg-green-100' : 
              metrics.contextEfficiency > 30 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <AlertCircle className={`h-6 w-6 ${
                metrics.contextEfficiency > 60 ? 'text-green-600' : 
                metrics.contextEfficiency > 30 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Context Efficiency</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.contextEfficiency.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Agent Utilization Chart */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Agent Utilization</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortName" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value}%`, 
                    props.payload.name
                  ]}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: '#f9fafb', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                  {agentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {Object.values(metrics.agentUtilization).filter(u => u > 0).length}
              </div>
              <div className="text-sm text-gray-600">Active Agents</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {Math.max(...Object.values(metrics.agentUtilization)).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Peak Utilization</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {(Object.values(metrics.agentUtilization).reduce((a, b) => a + b, 0) / Object.values(metrics.agentUtilization).length).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Avg Utilization</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};