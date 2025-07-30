/**
 * Multi-round requirements discovery command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { RequirementsAnalyst } from '../agents/requirements-analyst.js';
import { LinearIntegration } from '../integrations/linear.js';
import { SentraError } from '../types/index.js';

interface RequirementsOptions {
  rounds?: number;
  stakeholders?: string[];
  format?: 'gherkin' | 'user-story' | 'technical';
  output?: string;
  interactive?: boolean;
}

export const requirementsCommand = new Command('requirements')
  .description('Multi-round requirements discovery with stakeholder analysis')
  .option('-r, --rounds <number>', 'Number of discovery rounds', '3')
  .option('-s, --stakeholders <list>', 'Comma-separated list of stakeholder types')
  .option('-f, --format <type>', 'Output format: gherkin, user-story, technical', 'gherkin')
  .option('-o, --output <file>', 'Output file for requirements document')
  .option('-i, --interactive', 'Interactive mode with guided prompts', false)
  .action(async (options: RequirementsOptions) => {
    const spinner = ora('Starting requirements discovery...').start();
    
    try {
      await runRequirementsDiscovery(options);
      spinner.succeed(chalk.green('✅ Requirements discovery completed!'));
    } catch (error) {
      spinner.fail(chalk.red('❌ Requirements discovery failed'));
      throw error;
    }
  });

async function runRequirementsDiscovery(options: RequirementsOptions): Promise<void> {
  logger.info('Starting multi-round requirements discovery', { options });

  // Initialize Requirements Analyst
  const analyst = new RequirementsAnalyst();
  const linear = new LinearIntegration();

  // Validate Linear integration
  if (!await linear.isConfigured()) {
    throw new SentraError(
      'Linear integration not configured. Please set LINEAR_API_KEY and LINEAR_TEAM_ID.',
      'INTEGRATION_NOT_CONFIGURED'
    );
  }

  const rounds = parseInt(options.rounds || '3');
  const stakeholders = options.stakeholders ? options.stakeholders.split(',') : undefined;

  // Interactive mode setup
  if (options.interactive) {
    const interactiveConfig = await setupInteractiveDiscovery();
    Object.assign(options, interactiveConfig);
  }

  console.log(chalk.cyan('\n🔍 Requirements Discovery Process\n'));
  console.log(chalk.gray(`Rounds: ${rounds}`));
  console.log(chalk.gray(`Format: ${options.format}`));
  console.log(chalk.gray(`Stakeholders: ${stakeholders?.join(', ') || 'auto-detected'}\n`));

  // Execute discovery rounds
  const requirements = await analyst.executeDiscovery({
    rounds,
    stakeholders,
    format: options.format || 'gherkin',
    interactive: options.interactive || false
  });

  // Create Linear tasks from requirements
  console.log(chalk.cyan('\n📋 Creating Linear Tasks\n'));
  
  const tasks = [];
  for (const requirement of requirements.userStories) {
    const task = await linear.createTask({
      title: requirement.title,
      description: requirement.description,
      acceptanceCriteria: requirement.acceptanceCriteria,
      priority: requirement.priority,
      estimate: requirement.estimate,
      labels: ['requirements', 'sentra-generated', ...(requirement.labels || [])]
    });
    
    tasks.push(task);
    console.log(chalk.green(`✅ Created task: ${task.identifier} - ${task.title}`));
  }

  // Generate requirements document
  if (options.output) {
    await analyst.generateRequirementsDocument(requirements, options.output);
    console.log(chalk.green(`📄 Requirements document saved to: ${options.output}`));
  }

  // Display summary
  console.log(chalk.cyan('\n📊 Discovery Summary\n'));
  console.log(chalk.white(`Total User Stories: ${requirements.userStories.length}`));
  console.log(chalk.white(`Epic Stories: ${requirements.epics.length}`));
  console.log(chalk.white(`Stakeholders Identified: ${requirements.stakeholders.length}`));
  console.log(chalk.white(`Linear Tasks Created: ${tasks.length}`));
  console.log(chalk.white(`Total Story Points: ${requirements.totalEstimate}`));

  logger.info('Requirements discovery completed successfully', {
    userStories: requirements.userStories.length,
    epics: requirements.epics.length,
    stakeholders: requirements.stakeholders.length,
    tasksCreated: tasks.length,
    totalEstimate: requirements.totalEstimate
  });
}

async function setupInteractiveDiscovery(): Promise<Partial<RequirementsOptions>> {
  console.log(chalk.cyan('\n🎯 Interactive Requirements Discovery Setup\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is the name of your project?',
      validate: (input: string) => input.length > 0 || 'Project name is required'
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'Provide a brief description of your project:',
      validate: (input: string) => input.length > 10 || 'Please provide a more detailed description'
    },
    {
      type: 'checkbox',
      name: 'stakeholderTypes',
      message: 'Select the types of stakeholders for this project:',
      choices: [
        { name: 'Product Owner', value: 'product-owner', checked: true },
        { name: 'End Users', value: 'end-users', checked: true },
        { name: 'Business Analysts', value: 'business-analysts', checked: false },
        { name: 'Technical Team', value: 'technical-team', checked: true },
        { name: 'Marketing Team', value: 'marketing-team', checked: false },
        { name: 'Support Team', value: 'support-team', checked: false },
        { name: 'Compliance/Legal', value: 'compliance-legal', checked: false },
        { name: 'External Partners', value: 'external-partners', checked: false }
      ]
    },
    {
      type: 'list',
      name: 'projectType',
      message: 'What type of project is this?',
      choices: [
        { name: 'Web Application', value: 'web-app' },
        { name: 'Mobile Application', value: 'mobile-app' },
        { name: 'API/Backend Service', value: 'api-backend' },
        { name: 'Desktop Application', value: 'desktop-app' },
        { name: 'E-commerce Platform', value: 'ecommerce' },
        { name: 'Content Management System', value: 'cms' },
        { name: 'Data Analytics Platform', value: 'analytics' },
        { name: 'Other', value: 'other' }
      ]
    },
    {
      type: 'number',
      name: 'discoveryRounds',
      message: 'How many discovery rounds would you like to conduct?',
      default: 3,
      validate: (input: number) => input >= 1 && input <= 10 || 'Must be between 1 and 10 rounds'
    },
    {
      type: 'list',
      name: 'outputFormat',
      message: 'Preferred requirements format:',
      choices: [
        { name: 'Gherkin (Given-When-Then)', value: 'gherkin' },
        { name: 'User Stories (As-I Want-So That)', value: 'user-story' },
        { name: 'Technical Specifications', value: 'technical' }
      ]
    },
    {
      type: 'input',
      name: 'targetTimeline',
      message: 'What is your target timeline for this project? (e.g., "3 months", "Q2 2024")',
      default: '3 months'
    },
    {
      type: 'input',
      name: 'budgetConstraints',
      message: 'Are there any budget constraints or resource limitations?',
      default: 'Standard development resources'
    },
    {
      type: 'checkbox',
      name: 'specialRequirements',
      message: 'Select any special requirements that apply:',
      choices: [
        { name: 'GDPR Compliance', value: 'gdpr' },
        { name: 'HIPAA Compliance', value: 'hipaa' },
        { name: 'SOC 2 Compliance', value: 'soc2' },
        { name: 'Accessibility (WCAG 2.1 AA)', value: 'accessibility' },
        { name: 'Multi-language Support', value: 'i18n' },
        { name: 'High Availability (99.9%+)', value: 'high-availability' },
        { name: 'Real-time Features', value: 'real-time' },
        { name: 'Offline Capability', value: 'offline' },
        { name: 'Third-party Integrations', value: 'integrations' }
      ]
    },
    {
      type: 'confirm',
      name: 'generateDocument',
      message: 'Would you like to generate a requirements document?',
      default: true
    }
  ]);

  const config: Partial<RequirementsOptions> = {
    rounds: answers.discoveryRounds,
    stakeholders: answers.stakeholderTypes,
    format: answers.outputFormat,
    interactive: true
  };

  if (answers.generateDocument) {
    const { outputFile } = await inquirer.prompt([{
      type: 'input',
      name: 'outputFile',
      message: 'Output file name:',
      default: `requirements-${new Date().toISOString().split('T')[0]}.md`
    }]);
    config.output = outputFile;
  }

  // Store project context for the Requirements Analyst
  const projectContext = {
    name: answers.projectName,
    description: answers.projectDescription,
    type: answers.projectType,
    timeline: answers.targetTimeline,
    budget: answers.budgetConstraints,
    specialRequirements: answers.specialRequirements
  };

  logger.info('Interactive discovery configuration completed', { 
    config, 
    projectContext 
  });

  // Store context in agent
  // This would be passed to the Requirements Analyst for context-aware discovery

  return config;
}