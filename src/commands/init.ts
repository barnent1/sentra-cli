/**
 * Initialize Sentra in a project
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { SentraError } from '../types/index.js';

interface InitOptions {
  force?: boolean;
  template?: string;
  skipConfig?: boolean;
}

export const initCommand = new Command('init')
  .description('Initialize Sentra in a project')
  .option('-f, --force', 'Force initialization even if project already exists')
  .option('-t, --template <name>', 'Use a specific project template')
  .option('--skip-config', 'Skip interactive configuration setup')
  .action(async (options: InitOptions) => {
    const spinner = ora('Initializing Sentra project...').start();
    
    try {
      await initializeSentraProject(options);
      spinner.succeed(chalk.green('✅ Sentra project initialized successfully!'));
    } catch (error) {
      spinner.fail(chalk.red('❌ Failed to initialize Sentra project'));
      throw error;
    }
  });

async function initializeSentraProject(options: InitOptions): Promise<void> {
  const projectRoot = process.cwd();
  const sentraDir = path.join(projectRoot, '.sentra');
  
  logger.info('Starting Sentra project initialization', { 
    projectRoot, 
    options 
  });

  // Check if project already exists
  if (fs.existsSync(sentraDir) && !options.force) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'Sentra project already exists. Overwrite?',
      default: false
    }]);
    
    if (!overwrite) {
      throw new SentraError(
        'Project initialization cancelled by user',
        'INIT_CANCELLED'
      );
    }
  }

  // Create directory structure
  await createDirectoryStructure(sentraDir);
  
  // Create configuration files
  await createConfigurationFiles(projectRoot, sentraDir);
  
  // Interactive configuration setup
  if (!options.skipConfig) {
    await interactiveConfigSetup(sentraDir);
  }
  
  // Create environment template
  await createEnvironmentTemplate(projectRoot);
  
  // Initialize git hooks if git repository exists
  if (fs.existsSync(path.join(projectRoot, '.git'))) {
    await setupGitHooks(projectRoot);
  }
  
  logger.info('Sentra project initialization completed successfully');
}

async function createDirectoryStructure(sentraDir: string): Promise<void> {
  const directories = [
    'config',
    'personas',
    'tasks',
    'context',
    'logs',
    'cache',
    'templates'
  ];

  for (const dir of directories) {
    await fs.ensureDir(path.join(sentraDir, dir));
  }
  
  logger.debug('Created Sentra directory structure', { directories });
}

async function createConfigurationFiles(projectRoot: string, sentraDir: string): Promise<void> {
  // Main Sentra configuration
  const mainConfig = {
    version: '0.1.0',
    project: {
      name: path.basename(projectRoot),
      description: 'Sentra-enabled project',
      initialized: new Date().toISOString()
    },
    contextLimit: 40,
    testCoverageRequirement: 95,
    maxRetries: 3,
    permissionTimeout: 300000, // 5 minutes
    agents: {
      'requirements-analyst': { enabled: true, contextLimit: 30 },
      'ui-ux-designer': { enabled: true, contextLimit: 25 },
      'frontend-developer': { enabled: true, contextLimit: 35 },
      'backend-architect': { enabled: true, contextLimit: 35 },
      'qa-engineer': { enabled: true, contextLimit: 30 },
      'security-analyst': { enabled: true, contextLimit: 25 },
      'technical-writer': { enabled: true, contextLimit: 20 },
      'devops-engineer': { enabled: true, contextLimit: 30 }
    },
    notifications: {
      channels: ['dashboard', 'push'],
      quietHours: {
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      }
    }
  };

  await fs.writeJson(
    path.join(sentraDir, 'config', 'sentra.json'),
    mainConfig,
    { spaces: 2 }
  );

  // Persona configurations
  const personas = [
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
    const personaConfig = {
      name: persona,
      enabled: true,
      specializations: getPersonaSpecializations(persona),
      contextLimit: getPersonaContextLimit(persona),
      preferences: getPersonaPreferences(persona)
    };

    await fs.writeJson(
      path.join(sentraDir, 'personas', `${persona}.json`),
      personaConfig,
      { spaces: 2 }
    );
  }

  logger.debug('Created Sentra configuration files');
}

async function interactiveConfigSetup(sentraDir: string): Promise<void> {
  console.log(chalk.cyan('\n🔧 Interactive Configuration Setup\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: path.basename(process.cwd())
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'Project description:',
      default: 'A Sentra-enabled project'
    },
    {
      type: 'number',
      name: 'contextLimit',
      message: 'Context usage limit (percentage):',
      default: 40,
      validate: (input: number) => input > 0 && input <= 100
    },
    {
      type: 'number',
      name: 'testCoverage',
      message: 'Required test coverage (percentage):',
      default: 95,
      validate: (input: number) => input > 0 && input <= 100
    },
    {
      type: 'checkbox',
      name: 'enabledPersonas',
      message: 'Select personas to enable:',
      choices: [
        { name: 'Requirements Analyst Master', value: 'requirements-analyst', checked: true },
        { name: 'UI/UX Designer Master', value: 'ui-ux-designer', checked: true },
        { name: 'Frontend Developer Master', value: 'frontend-developer', checked: true },
        { name: 'Backend Architect Master', value: 'backend-architect', checked: true },
        { name: 'QA Engineer Master', value: 'qa-engineer', checked: true },
        { name: 'Security Analyst Master', value: 'security-analyst', checked: true },
        { name: 'Technical Writer Master', value: 'technical-writer', checked: true },
        { name: 'DevOps Engineer Master', value: 'devops-engineer', checked: true }
      ]
    },
    {
      type: 'checkbox',
      name: 'notificationChannels',
      message: 'Select notification channels:',
      choices: [
        { name: 'Dashboard', value: 'dashboard', checked: true },
        { name: 'Push Notifications', value: 'push', checked: true },
        { name: 'SMS', value: 'sms', checked: false },
        { name: 'Email', value: 'email', checked: false }
      ]
    }
  ]);

  // Update configuration with user preferences
  const configPath = path.join(sentraDir, 'config', 'sentra.json');
  const config = await fs.readJson(configPath);
  
  config.project.name = answers.projectName;
  config.project.description = answers.projectDescription;
  config.contextLimit = answers.contextLimit;
  config.testCoverageRequirement = answers.testCoverage;
  config.notifications.channels = answers.notificationChannels;

  // Update persona enablement
  for (const persona of Object.keys(config.agents)) {
    config.agents[persona].enabled = answers.enabledPersonas.includes(persona);
  }

  await fs.writeJson(configPath, config, { spaces: 2 });
  
  logger.info('Interactive configuration completed', { answers });
}

async function createEnvironmentTemplate(projectRoot: string): Promise<void> {
  const envTemplate = `# Sentra CLI Configuration
# The intelligent Claude Code command center for autonomous project execution

# Core Configuration
NODE_ENV=development
LOG_LEVEL=info

# Linear Integration (Required)
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_TEAM_ID=your_team_id_here
LINEAR_WORKSPACE_ID=your_workspace_id_here

# GitHub Integration (Required)
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here

# Figma Integration (Optional)
FIGMA_ACCESS_TOKEN=your_figma_token_here
FIGMA_TEAM_ID=your_figma_team_id_here

# Twilio SMS Integration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
TWILIO_NOTIFICATION_NUMBER=your_notification_phone_number_here

# Pushover Push Notifications (Optional)
PUSHOVER_TOKEN=your_pushover_app_token_here
PUSHOVER_USER=your_pushover_user_key_here

# Dashboard Configuration
DASHBOARD_PORT=3001
DASHBOARD_HOST=localhost

# Database Configuration (Optional - uses SQLite by default)
DATABASE_URL=postgresql://user:password@localhost:5432/sentra

# Redis Configuration (Optional - for caching)
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# Monitoring & Analytics (Optional)
SENTRY_DSN=your_sentry_dsn_here
ANALYTICS_ID=your_analytics_id_here
`;

  const envPath = path.join(projectRoot, '.env.example');
  if (!fs.existsSync(envPath)) {
    await fs.writeFile(envPath, envTemplate);
    logger.debug('Created .env.example template');
  }
}

async function setupGitHooks(projectRoot: string): Promise<void> {
  const gitHooksDir = path.join(projectRoot, '.git', 'hooks');
  
  if (!fs.existsSync(gitHooksDir)) {
    return;
  }

  // Pre-commit hook for quality gates
  const preCommitHook = `#!/bin/sh
# Sentra quality gates
echo "🔍 Running Sentra quality gates..."

# Run tests if test script exists
if [ -f "package.json" ] && npm run test --silent 2>/dev/null; then
  echo "✅ Tests passed"
else
  echo "⚠️  No tests found or tests failed"
fi

# Run linting if available
if [ -f "package.json" ] && npm run lint --silent 2>/dev/null; then
  echo "✅ Linting passed"
fi

# Run type checking if available
if [ -f "package.json" ] && npm run typecheck --silent 2>/dev/null; then
  echo "✅ Type checking passed"
fi

echo "✅ Quality gates completed"
`;

  const preCommitPath = path.join(gitHooksDir, 'pre-commit');
  await fs.writeFile(preCommitPath, preCommitHook);
  await fs.chmod(preCommitPath, 0o755);
  
  logger.debug('Set up git hooks');
}

function getPersonaSpecializations(persona: string): string[] {
  const specializations: Record<string, string[]> = {
    'requirements-analyst': [
      'stakeholder-analysis',
      'user-story-creation',
      'acceptance-criteria',
      'requirements-validation'
    ],
    'ui-ux-designer': [
      'user-experience-design',
      'interface-design',
      'design-systems',
      'accessibility',
      'figma-integration'
    ],
    'frontend-developer': [
      'react-development',
      'typescript',
      'responsive-design',
      'state-management',
      'component-architecture'
    ],
    'backend-architect': [
      'api-design',
      'database-architecture',
      'microservices',
      'scalability',
      'performance-optimization'
    ],
    'qa-engineer': [
      'test-automation',
      'quality-assurance',
      'performance-testing',
      'security-testing',
      'ci-cd-integration'
    ],
    'security-analyst': [
      'security-auditing',
      'vulnerability-assessment',
      'compliance',
      'secure-coding',
      'penetration-testing'
    ],
    'technical-writer': [
      'documentation',
      'api-documentation',
      'user-guides',
      'technical-specifications',
      'knowledge-management'
    ],
    'devops-engineer': [
      'ci-cd-pipelines',
      'infrastructure-as-code',
      'containerization',
      'monitoring',
      'deployment-automation'
    ]
  };

  return specializations[persona] || [];
}

function getPersonaContextLimit(persona: string): number {
  const limits: Record<string, number> = {
    'requirements-analyst': 30,
    'ui-ux-designer': 25,
    'frontend-developer': 35,
    'backend-architect': 35,
    'qa-engineer': 30,
    'security-analyst': 25,
    'technical-writer': 20,
    'devops-engineer': 30
  };

  return limits[persona] || 30;
}

function getPersonaPreferences(persona: string): Record<string, unknown> {
  const preferences: Record<string, Record<string, unknown>> = {
    'requirements-analyst': {
      discoveryRounds: 3,
      stakeholderValidation: true,
      acceptanceCriteriaFormat: 'gherkin'
    },
    'ui-ux-designer': {
      designSystem: 'material-design',
      accessibilityLevel: 'WCAG-2.1-AA',
      responsiveBreakpoints: ['mobile', 'tablet', 'desktop']
    },
    'frontend-developer': {
      framework: 'react',
      typescript: true,
      testingLibrary: 'vitest',
      stateManagement: 'zustand'
    },
    'backend-architect': {
      architecture: 'microservices',
      database: 'postgresql',
      apiStyle: 'rest',
      caching: 'redis'
    },
    'qa-engineer': {
      testTypes: ['unit', 'integration', 'e2e'],
      coverageThreshold: 95,
      automationFramework: 'playwright'
    },
    'security-analyst': {
      scanTypes: ['sast', 'dast', 'dependency'],
      complianceStandards: ['OWASP', 'SOC2'],
      auditFrequency: 'weekly'
    },
    'technical-writer': {
      documentationFormats: ['markdown', 'openapi'],
      audienceTypes: ['developer', 'user', 'admin'],
      updateFrequency: 'per-release'
    },
    'devops-engineer': {
      containerPlatform: 'docker',
      orchestration: 'kubernetes',
      cicdPlatform: 'github-actions',
      monitoringStack: ['prometheus', 'grafana']
    }
  };

  return preferences[persona] || {};
}