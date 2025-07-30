/**
 * Dashboard Header Component
 */

import React from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';

interface HeaderProps {
  connected: boolean;
  projectName: string;
}

export const Header: React.FC<HeaderProps> = ({ connected, projectName }) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sentra Dashboard</h1>
                <p className="text-sm text-gray-500">{projectName}</p>
              </div>
            </div>
          </div>

          {/* Status and Info */}
          <div className="flex items-center space-x-6">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {connected ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Disconnected</span>
                </>
              )}
            </div>

            {/* Real-time Indicator */}
            <div className="flex items-center space-x-2">
              <div className={clsx(
                'w-2 h-2 rounded-full',
                connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
              )} />
              <span className="text-sm text-gray-600">
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Version */}
            <div className="text-sm text-gray-500">
              v0.1.0
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};