/**
 * Agents Panel Component - Shows status of all 8 AI personas
 */

import React from 'react';
import { 
  User, 
  Palette, 
  Code, 
  Server, 
  Shield, 
  FileText, 
  Settings, 
  TestTube,
  Activity,
  Clock,
  Zap
} from 'lucide-react';
import clsx from 'clsx';
import { Agent, PersonaType } from '../../../types';

interface AgentsPanelProps {
  agents: Agent[];
}

const getPersonaIcon = (persona: PersonaType) => {
  const icons = {
    'requirements-analyst': User,
    'ui-ux-designer': Palette,
    'frontend-developer': Code,
    'backend-architect': Server,
    'qa-engineer': TestTube,
    'security-analyst': Shield,
    'technical-writer': FileText,
    'devops-engineer': Settings
  };
  return icons[persona] || Activity;
};

const getPersonaDisplayName = (persona: PersonaType): string => {
  const names = {
    'requirements-analyst': 'Requirements Analyst',
    'ui-ux-designer': 'UI/UX Designer',
    'frontend-developer': 'Frontend Developer',
    'backend-architect': 'Backend Architect',
    'qa-engineer': 'QA Engineer',
    'security-analyst': 'Security Analyst',
    'technical-writer': 'Technical Writer',
    'devops-engineer': 'DevOps Engineer'
  };
  return names[persona] || persona;
};

const getStatusColor = (status: Agent['status']) => {
  const colors = {
    idle: 'bg-gray-100 text-gray-800',
    working: 'bg-blue-100 text-blue-800',
    blocked: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  };
  return colors[status] || colors.idle;
};

const getStatusIcon = (status: Agent['status']) => {
  switch (status) {
    case 'working':
      return <Zap className="h-4 w-4" />;
    case 'blocked':
      return <Clock className="h-4 w-4" />;
    case 'error':
      return <Shield className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

export const AgentsPanel: React.FC<AgentsPanelProps> = ({ agents }) => {
  const sortedAgents = [...agents].sort((a, b) => {
    // Sort by status (working first, then by name)
    if (a.status === 'working' && b.status !== 'working') return -1;
    if (b.status === 'working' && a.status !== 'working') return 1;
    return getPersonaDisplayName(a.persona).localeCompare(getPersonaDisplayName(b.persona));
  });

  const workingCount = agents.filter(a => a.status === 'working').length;
  const averageContextUsage = agents.length > 0 
    ? agents.reduce((sum, a) => sum + a.contextUsage, 0) / agents.length 
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">AI Personas</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{workingCount} active</span>
            <span>{averageContextUsage.toFixed(1)}% avg context</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedAgents.map((agent) => {
            const IconComponent = getPersonaIcon(agent.persona);
            
            return (
              <div
                key={agent.id}
                className={clsx(
                  'p-4 rounded-lg border-2 transition-all duration-200',
                  agent.status === 'working' 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={clsx(
                      'p-2 rounded-lg',
                      agent.status === 'working' ? 'bg-blue-600' : 'bg-gray-400'
                    )}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getPersonaDisplayName(agent.persona)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {agent.specializations.slice(0, 2).join(', ')}
                        {agent.specializations.length > 2 && '...'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={clsx(
                    'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                    getStatusColor(agent.status)
                  )}>
                    {getStatusIcon(agent.status)}
                    <span>{agent.status}</span>
                  </div>
                </div>

                {/* Context Usage Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Context Usage</span>
                    <span className="text-sm font-medium text-gray-900">
                      {agent.contextUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all duration-300',
                        agent.contextUsage > 80 ? 'bg-red-500' :
                        agent.contextUsage > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      )}
                      style={{ width: `${Math.min(agent.contextUsage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Current Task */}
                {agent.currentTask && (
                  <div className="text-sm">
                    <span className="text-gray-600">Current Task:</span>
                    <p className="font-medium text-gray-900 truncate">
                      {agent.currentTask.title}
                    </p>
                  </div>
                )}

                {/* Context Limit */}
                <div className="text-xs text-gray-500 mt-2">
                  Limit: {agent.contextLimit}%
                </div>
              </div>
            );
          })}
        </div>

        {agents.length === 0 && (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No agents initialized</p>
          </div>
        )}
      </div>
    </div>
  );
};