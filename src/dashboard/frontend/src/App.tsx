/**
 * Main Sentra Dashboard Application
 */

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { DashboardData, SystemMetrics, Agent, Task, PermissionRequest } from '../../types';
import { Header } from './components/Header';
import { AgentsPanel } from './components/AgentsPanel';
import { ContextPanel } from './components/ContextPanel';
import { TasksPanel } from './components/TasksPanel';
import { PermissionsPanel } from './components/PermissionsPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { NotificationCenter } from './components/NotificationCenter';
import { EmergencyControls } from './components/EmergencyControls';
import { ConnectionStatus } from './components/ConnectionStatus';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

export const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const newSocket = io(socketUrl);

    newSocket.on('connect', () => {
      setConnected(true);
      setError(null);
      addNotification('success', 'Connected', 'Dashboard connected successfully');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      addNotification('warning', 'Disconnected', 'Dashboard connection lost');
    });

    newSocket.on('connect_error', (err) => {
      setError(`Connection failed: ${err.message}`);
      addNotification('error', 'Connection Error', err.message);
    });

    // Dashboard data updates
    newSocket.on('dashboard-data', (data: DashboardData) => {
      setDashboardData(data);
      setLoading(false);
    });

    // Real-time event handlers
    newSocket.on('task-assigned', (event) => {
      addNotification('info', 'Task Assigned', `Task assigned to ${event.data.agent}`);
    });

    newSocket.on('task-completed', (event) => {
      addNotification('success', 'Task Completed', `Task completed by ${event.data.agent}`);
    });

    newSocket.on('task-failed', (event) => {
      addNotification('error', 'Task Failed', `Task failed: ${event.data.details?.error || 'Unknown error'}`);
    });

    newSocket.on('agent-status-changed', (event) => {
      addNotification('info', 'Agent Status', `${event.data.agent} status: ${event.data.current}`);
    });

    newSocket.on('context-warning', (event) => {
      addNotification('warning', 'Context Warning', `${event.persona} context usage: ${event.usage.toFixed(1)}%`);
    });

    newSocket.on('context-critical', (event) => {
      addNotification('error', 'Context Critical', `Total context usage: ${event.totalUsage.toFixed(1)}%`);
    });

    newSocket.on('permission-requested', (event) => {
      addNotification('warning', 'Permission Request', `${event.data.agent} requests ${event.data.riskLevel} permission`);
    });

    newSocket.on('permission-approved', (event) => {
      addNotification('success', 'Permission Approved', `${event.data.agent} permission approved`);
    });

    newSocket.on('permission-denied', (event) => {
      addNotification('info', 'Permission Denied', `${event.data.agent} permission denied`);
    });

    newSocket.on('emergency-stop', (event) => {
      addNotification('error', 'Emergency Stop', event.reason);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (connected) {
      fetchDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        setLoading(false);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch dashboard data: ${message}`);
      addNotification('error', 'Data Fetch Error', message);
    }
  };

  const addNotification = (type: Notification['type'], title: string, message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date()
    };

    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handlePermissionResponse = async (requestId: string, approved: boolean, reason?: string) => {
    try {
      const response = await fetch(`/api/permissions/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved, reason }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      addNotification('success', 'Permission Response', `Permission ${approved ? 'approved' : 'denied'}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addNotification('error', 'Permission Error', `Failed to respond: ${message}`);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      const response = await fetch('/api/emergency-stop', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      addNotification('success', 'Emergency Stop', 'All agents stopped successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addNotification('error', 'Emergency Stop Error', `Failed to stop agents: ${message}`);
    }
  };

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading Sentra Dashboard...</h2>
          <p className="text-gray-600">Connecting to orchestration system</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        connected={connected}
        projectName={dashboardData?.project?.name || 'Sentra Project'}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Connection Status */}
        <ConnectionStatus connected={connected} error={error} />

        {/* Emergency Controls */}
        <EmergencyControls onEmergencyStop={handleEmergencyStop} />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Metrics Overview */}
          <div className="lg:col-span-3">
            <MetricsPanel metrics={dashboardData?.metrics} />
          </div>

          {/* Agents Panel */}
          <div className="lg:col-span-2">
            <AgentsPanel agents={dashboardData?.agents || []} />
          </div>

          {/* Context Panel */}
          <div>
            <ContextPanel 
              contextStatus={dashboardData?.project?.context}
              totalUsage={dashboardData?.project?.context?.totalUsage || 0}
            />
          </div>

          {/* Tasks Panel */}
          <div className="lg:col-span-2">
            <TasksPanel tasks={dashboardData?.tasks || []} />
          </div>

          {/* Permissions Panel */}
          <div>
            <PermissionsPanel 
              permissions={dashboardData?.permissions || []}
              onResponse={handlePermissionResponse}
            />
          </div>
        </div>

        {/* Notification Center */}
        <NotificationCenter 
          notifications={notifications}
          onRemove={removeNotification}
        />
      </div>
    </div>
  );
};