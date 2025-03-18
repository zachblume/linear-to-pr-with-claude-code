// This script tests the integration with Claude custom commands
// Run with: node test-command.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    console.log('Testing Claude custom command integration...');
    
    // Mock issue data
    const issueDetails = `Title: Add notification system, Description: We need to implement a real-time notification system to alert users about updates, mentions, and system events.`;
    
    // Create command file
    console.log('Checking for custom command...');
    const commandPath = path.join(__dirname, '.claude', 'commands', 'analyze-issue.md');
    
    if (fs.existsSync(commandPath)) {
      console.log(`Custom command found at: ${commandPath}`);
      console.log(`Command content: ${fs.readFileSync(commandPath, 'utf8')}`);
    } else {
      console.log(`Custom command not found at: ${commandPath}`);
      return;
    }
    
    // Try to execute the command programmatically
    console.log('Invoking custom command via Claude Code CLI...');
    console.log(`Command: claude -p "/project:analyze-issue '${issueDetails}'"`);
    
    try {
      const result = execSync(`claude -p "/project:analyze-issue '${issueDetails}'"`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log('\n=== Custom Command Result ===\n');
      console.log(result);
      console.log('\n=== End Result ===\n');
      
      console.log('Command executed successfully!');
    } catch (err) {
      console.warn(`Warning: Could not execute custom command: ${err.message}`);
      console.log('In a real scenario, Claude would process this command to analyze the issue.');
    }
    
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    console.error(error);
  }
}

console.log('Running test-command.js...');
run();