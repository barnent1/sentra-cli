/**
 * Context Manager - Enforces <40% context usage to prevent AI hallucinations
 */

import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import { 
  PersonaType, 
  ContextItem, 
  ContextLimits, 
  ProjectContext,
  ContextOverflowError,
  SentraError 
} from '../types/index.js';
import { logger } from '../utils/logger.js';

interface ContextWindow {
  persona: PersonaType;
  items: ContextItem[];
  currentUsage: number;
  lastUpdated: Date;
  priority: number;
}

export class ContextManager extends EventEmitter {
  private contextWindows: Map<PersonaType, ContextWindow> = new Map();
  private projectContext: ProjectContext;
  private contextDir: string;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(projectRoot: string = process.cwd()) {
    super();
    this.contextDir = path.join(projectRoot, '.sentra', 'context');
    
    // Initialize project context with safe defaults
    this.projectContext = {
      totalUsage: 0,
      agentUsage: {} as Record<PersonaType, number>,
      activeContext: [],
      limits: {
        maxPercentage: 40,
        warningThreshold: 35,
        maxItems: 1000
      }
    };

    this.initializeContextWindows();
    this.ensureContextDirectory();
  }

  /**
   * Initialize context windows for each persona
   */
  private initializeContextWindows(): void {
    const personas: PersonaType[] = [
      'requirements-analyst',
      'ui-ux-designer',
      'frontend-developer',
      'backend-architect',
      'qa-engineer',
      'security-analyst',
      'technical-writer',
      'devops-engineer'
    ];

    for (const persona of personas) {
      this.contextWindows.set(persona, {
        persona,
        items: [],
        currentUsage: 0,
        lastUpdated: new Date(),
        priority: this.getPersonaPriority(persona)
      });

      // Initialize agent usage tracking
      this.projectContext.agentUsage[persona] = 0;
    }

    logger.debug('Initialized context windows for all personas');
  }

  /**
   * Start context monitoring system
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Monitor context usage every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performContextAnalysis();
    }, 30000);

    logger.info('Context monitoring started');
    this.emit('monitoring.started', { timestamp: new Date() });
  }

  /**
   * Stop context monitoring system
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Context monitoring stopped');
    this.emit('monitoring.stopped', { timestamp: new Date() });
  }

  /**
   * Add context item for a specific persona
   */
  async addContext(persona: PersonaType, item: ContextItem): Promise<void> {
    const window = this.contextWindows.get(persona);
    if (!window) {
      throw new SentraError(`Context window not found for persona: ${persona}`, 'CONTEXT_WINDOW_NOT_FOUND');
    }

    // Calculate item size (approximate token count)
    const itemSize = this.calculateItemSize(item);
    item.size = itemSize;

    // Check if adding this item would exceed limits
    const newUsage = window.currentUsage + itemSize;
    const usagePercentage = (newUsage / this.getContextCapacity(persona)) * 100;

    if (usagePercentage > this.projectContext.limits.maxPercentage) {
      // Attempt automatic cleanup
      await this.performAutomaticCleanup(persona, itemSize);
      
      // Check again after cleanup
      const updatedUsage = window.currentUsage + itemSize;
      const updatedPercentage = (updatedUsage / this.getContextCapacity(persona)) * 100;
      
      if (updatedPercentage > this.projectContext.limits.maxPercentage) {
        throw new ContextOverflowError(updatedPercentage, this.projectContext.limits.maxPercentage);
      }
    }

    // Add item to context window
    window.items.push(item);
    window.currentUsage += itemSize;
    window.lastUpdated = new Date();

    // Update project-level tracking
    this.projectContext.agentUsage[persona] = usagePercentage;
    this.updateTotalUsage();

    // Persist context state
    await this.persistContextState(persona);

    logger.debug(`Added context item for ${persona}`, {
      itemType: item.type,
      itemSize: itemSize,
      currentUsage: usagePercentage.toFixed(2) + '%',
      totalItems: window.items.length
    });

    // Emit warning if approaching limit
    if (usagePercentage >= this.projectContext.limits.warningThreshold) {
      this.emit('context.warning', {
        persona,
        usage: usagePercentage,
        threshold: this.projectContext.limits.warningThreshold,
        recommendation: 'Consider cleanup or task decomposition'
      });
    }
  }

  /**
   * Remove context item
   */
  async removeContext(persona: PersonaType, itemPath: string): Promise<boolean> {
    const window = this.contextWindows.get(persona);
    if (!window) {
      return false;
    }

    const itemIndex = window.items.findIndex(item => item.path === itemPath);
    if (itemIndex === -1) {
      return false;
    }

    const removedItem = window.items.splice(itemIndex, 1)[0];
    window.currentUsage -= removedItem.size;
    window.lastUpdated = new Date();

    // Update project-level tracking
    const usagePercentage = (window.currentUsage / this.getContextCapacity(persona)) * 100;
    this.projectContext.agentUsage[persona] = usagePercentage;
    this.updateTotalUsage();

    // Persist context state
    await this.persistContextState(persona);

    logger.debug(`Removed context item for ${persona}`, {
      itemPath: itemPath,
      itemSize: removedItem.size,
      currentUsage: usagePercentage.toFixed(2) + '%',
      totalItems: window.items.length
    });

    return true;
  }

  /**
   * Calculate current usage percentage for a persona
   */
  async calculateUsage(persona: PersonaType): Promise<number> {
    const window = this.contextWindows.get(persona);
    if (!window) {
      return 0;
    }

    const capacity = this.getContextCapacity(persona);
    const usagePercentage = (window.currentUsage / capacity) * 100;
    
    // Update cached value
    this.projectContext.agentUsage[persona] = usagePercentage;
    
    return usagePercentage;
  }

  /**
   * Get total context usage across all personas
   */
  getTotalUsage(): number {
    return this.projectContext.totalUsage;
  }

  /**
   * Get detailed context status
   */
  getContextStatus(): {
    totalUsage: number;
    agentUsage: Record<PersonaType, number>;
    limits: ContextLimits;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Check for high usage patterns
    const highUsageAgents = Object.entries(this.projectContext.agentUsage)
      .filter(([_, usage]) => usage > this.projectContext.limits.warningThreshold)
      .map(([persona, usage]) => ({ persona: persona as PersonaType, usage }));

    if (highUsageAgents.length > 0) {
      recommendations.push(
        `High context usage detected for: ${highUsageAgents.map(a => a.persona).join(', ')}`
      );
      recommendations.push('Consider decomposing tasks or cleaning up unused context');
    }

    if (this.projectContext.totalUsage > this.projectContext.limits.warningThreshold) {
      recommendations.push('Total context usage is approaching critical levels');
      recommendations.push('Emergency cleanup may be required soon');
    }

    return {
      totalUsage: this.projectContext.totalUsage,
      agentUsage: { ...this.projectContext.agentUsage },
      limits: { ...this.projectContext.limits },
      recommendations
    };
  }

  /**
   * Perform automatic cleanup for a persona
   */
  async performAutomaticCleanup(persona: PersonaType, requiredSpace: number): Promise<void> {
    const window = this.contextWindows.get(persona);
    if (!window) {
      return;
    }

    logger.info(`Performing automatic cleanup for ${persona}`, {
      currentUsage: window.currentUsage,
      requiredSpace,
      itemCount: window.items.length
    });

    // Sort items by priority (oldest and least important first)
    const sortedItems = [...window.items].sort((a, b) => {
      // Prioritize by type: config < dependency < file < interface
      const typePriority = { config: 1, dependency: 2, file: 3, interface: 4 };
      return typePriority[a.type] - typePriority[b.type];
    });

    let freedSpace = 0;
    const itemsToRemove: string[] = [];

    // Remove items until we have enough space
    for (const item of sortedItems) {
      if (freedSpace >= requiredSpace) {
        break;
      }
      
      itemsToRemove.push(item.path);
      freedSpace += item.size;
    }

    // Remove identified items
    for (const itemPath of itemsToRemove) {
      await this.removeContext(persona, itemPath);
    }

    logger.info(`Automatic cleanup completed for ${persona}`, {
      itemsRemoved: itemsToRemove.length,
      spaceFreed: freedSpace,
      remainingItems: window.items.length
    });

    this.emit('context.cleanup.completed', {
      persona,
      itemsRemoved: itemsToRemove.length,
      spaceFreed: freedSpace
    });
  }

  /**
   * Manual cleanup for a persona
   */
  async cleanup(persona: PersonaType): Promise<void> {
    const window = this.contextWindows.get(persona);
    if (!window) {
      return;
    }

    const itemsRemoved = window.items.length;
    const spaceFreed = window.currentUsage;

    // Clear all context items
    window.items = [];
    window.currentUsage = 0;
    window.lastUpdated = new Date();

    // Update project-level tracking
    this.projectContext.agentUsage[persona] = 0;
    this.updateTotalUsage();

    // Remove persisted state
    await this.removePersistedState(persona);

    logger.info(`Manual cleanup completed for ${persona}`, {
      itemsRemoved,
      spaceFreed
    });

    this.emit('context.cleanup.manual', {
      persona,
      itemsRemoved,
      spaceFreed
    });
  }

  /**
   * Emergency cleanup across all personas
   */
  async emergencyCleanup(): Promise<void> {
    logger.warn('Emergency context cleanup initiated');

    let totalItemsRemoved = 0;
    let totalSpaceFreed = 0;

    for (const persona of this.contextWindows.keys()) {
      const window = this.contextWindows.get(persona);
      if (window && window.items.length > 0) {
        totalItemsRemoved += window.items.length;
        totalSpaceFreed += window.currentUsage;
        
        await this.cleanup(persona);
      }
    }

    // Reset project context
    this.projectContext.totalUsage = 0;
    this.projectContext.activeContext = [];
    for (const persona of Object.keys(this.projectContext.agentUsage) as PersonaType[]) {
      this.projectContext.agentUsage[persona] = 0;
    }

    logger.warn('Emergency cleanup completed', {
      totalItemsRemoved,
      totalSpaceFreed
    });

    this.emit('context.emergency.cleanup', {
      totalItemsRemoved,
      totalSpaceFreed,
      timestamp: new Date()
    });
  }

  /**
   * Perform regular context analysis
   */
  private async performContextAnalysis(): Promise<void> {
    const status = this.getContextStatus();
    
    // Log current status
    logger.debug('Context analysis completed', {
      totalUsage: status.totalUsage.toFixed(2) + '%',
      highestUsage: Math.max(...Object.values(status.agentUsage)).toFixed(2) + '%',
      recommendationCount: status.recommendations.length
    });

    // Emit status update
    this.emit('context.analysis', {
      timestamp: new Date(),
      status: status
    });

    // Check for critical conditions
    if (status.totalUsage > this.projectContext.limits.maxPercentage * 0.9) {
      this.emit('context.critical', {
        totalUsage: status.totalUsage,
        message: 'Context usage approaching critical levels - immediate action required'
      });
    }
  }

  /**
   * Helper methods
   */
  private calculateItemSize(item: ContextItem): number {
    // Estimate token count based on content
    let size = 0;
    
    // Base size for metadata
    size += item.path.length / 4; // Approximate tokens for path
    
    // Content size (if available)
    if (item.content) {
      // Rough estimation: 1 token per 4 characters
      size += item.content.length / 4;
    } else {
      // Default size for different types
      const typeSizes = {
        file: 100,      // Files typically contain significant content
        interface: 50,  // Interfaces are usually smaller
        dependency: 25, // Dependencies are references
        config: 30      // Config items vary but are generally small
      };
      size += typeSizes[item.type] || 50;
    }
    
    return Math.round(size);
  }

  private getContextCapacity(persona: PersonaType): number {
    // Base capacity (in estimated tokens)
    const baseCapacity = 8000; // Roughly 8K token context window
    
    // Persona-specific adjustments
    const adjustments: Record<PersonaType, number> = {
      'requirements-analyst': 1.2,  // Needs more context for analysis
      'ui-ux-designer': 0.9,        // More visual, less textual context
      'frontend-developer': 1.1,    // Moderate context needs
      'backend-architect': 1.3,     // High context for system design
      'qa-engineer': 1.0,           // Standard context needs
      'security-analyst': 0.8,      // Focused, specific context
      'technical-writer': 0.7,      // Documentation focused
      'devops-engineer': 1.0        // Standard context needs
    };

    return Math.round(baseCapacity * (adjustments[persona] || 1.0));
  }

  private getPersonaPriority(persona: PersonaType): number {
    // Higher numbers = higher priority for context retention
    const priorities: Record<PersonaType, number> = {
      'requirements-analyst': 9,  // Highest - foundational work
      'backend-architect': 8,     // High - core system design
      'frontend-developer': 7,    // High - implementation
      'qa-engineer': 6,           // Medium-High - quality assurance
      'security-analyst': 6,      // Medium-High - security critical
      'ui-ux-designer': 5,        // Medium - design work
      'devops-engineer': 4,       // Medium - infrastructure
      'technical-writer': 3       // Lower - documentation can be regenerated
    };

    return priorities[persona] || 5;
  }

  private updateTotalUsage(): void {
    const totalUsage = Object.values(this.projectContext.agentUsage)
      .reduce((sum, usage) => sum + usage, 0) / Object.keys(this.projectContext.agentUsage).length;
    
    this.projectContext.totalUsage = totalUsage;
  }

  private async ensureContextDirectory(): Promise<void> {
    await fs.ensureDir(this.contextDir);
  }

  private async persistContextState(persona: PersonaType): Promise<void> {
    const window = this.contextWindows.get(persona);
    if (!window) {
      return;
    }

    const statePath = path.join(this.contextDir, `${persona}.json`);
    const state = {
      persona: window.persona,
      items: window.items,
      currentUsage: window.currentUsage,
      lastUpdated: window.lastUpdated.toISOString(),
      priority: window.priority
    };

    await fs.writeJson(statePath, state, { spaces: 2 });
  }

  private async removePersistedState(persona: PersonaType): Promise<void> {
    const statePath = path.join(this.contextDir, `${persona}.json`);
    
    if (await fs.pathExists(statePath)) {
      await fs.remove(statePath);
    }
  }

  /**
   * Load persisted context state on initialization
   */
  async loadPersistedState(): Promise<void> {
    for (const persona of this.contextWindows.keys()) {
      const statePath = path.join(this.contextDir, `${persona}.json`);
      
      if (await fs.pathExists(statePath)) {
        try {
          const state = await fs.readJson(statePath);
          const window = this.contextWindows.get(persona);
          
          if (window && state.items) {
            window.items = state.items;
            window.currentUsage = state.currentUsage || 0;
            window.lastUpdated = new Date(state.lastUpdated || Date.now());
            window.priority = state.priority || this.getPersonaPriority(persona);
            
            // Update project-level tracking
            const usagePercentage = (window.currentUsage / this.getContextCapacity(persona)) * 100;
            this.projectContext.agentUsage[persona] = usagePercentage;
          }
        } catch (error) {
          logger.warn(`Failed to load context state for ${persona}`, { error });
        }
      }
    }

    this.updateTotalUsage();
    logger.info('Context state loaded from persistence');
  }
}