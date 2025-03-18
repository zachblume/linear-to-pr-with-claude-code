// This script allows you to test the action locally
// Create a .env file based on .env.example and run with: node test-local.js

require('dotenv').config();

const { LinearClient } = require('@linear/sdk');
const { Octokit } = require('@octokit/rest');
const { Anthropic } = require('@anthropic-ai/sdk');

async function run() {
  try {
    // Get inputs from environment variables
    const linearApiKey = process.env.LINEAR_API_KEY;
    const linearIssueId = process.env.LINEAR_ISSUE_ID;
    const githubToken = process.env.GITHUB_TOKEN;
    const claudeApiKey = process.env.CLAUDE_API_KEY;

    // Check required inputs
    if (!linearApiKey) throw new Error('LINEAR_API_KEY is required');
    if (!linearIssueId) throw new Error('LINEAR_ISSUE_ID is required');
    if (!githubToken) throw new Error('GITHUB_TOKEN is required');
    if (!claudeApiKey) throw new Error('CLAUDE_API_KEY is required');

    // Initialize clients
    const linearClient = new LinearClient({ apiKey: linearApiKey });
    const octokit = new Octokit({ auth: githubToken });
    const anthropic = new Anthropic({ apiKey: claudeApiKey });

    // Get repository info
    const owner = process.env.REPO_OWNER || 'zachblume';
    const repo = process.env.REPO_NAME || 'linear-to-pr-with-claude-code';

    // Get issue details from Linear
    console.log(`Fetching Linear issue: ${linearIssueId}`);
    const issue = await linearClient.issue(linearIssueId);
    
    if (!issue) {
      throw new Error(`Issue ${linearIssueId} not found`);
    }

    const issueTitle = issue.title;
    const issueDescription = issue.description || '';
    
    console.log(`Found issue: ${issueTitle}`);

    // Create a new branch for the PR
    const branchName = `linear-${linearIssueId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    // Get the default branch
    const repoDetails = await octokit.repos.get({
      owner,
      repo
    });
    
    const defaultBranch = repoDetails.data.default_branch;
    console.log(`Default branch is: ${defaultBranch}`);
    
    // Get reference to HEAD of default branch
    const refResponse = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`
    });
    
    const sha = refResponse.data.object.sha;
    
    // Create a new branch
    console.log(`Creating branch: ${branchName}`);
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: sha
    });

    // Ask Claude to generate a plan based on the issue description
    console.log('Asking Claude to analyze the issue and generate a plan');
    const claudePrompt = `
You are a helpful assistant tasked with analyzing a Linear issue and creating a plan to implement it. 
The issue is described as follows:

Title: ${issueTitle}
Description: ${issueDescription}

Based on this description, please create:
1. A concise summary of what needs to be implemented
2. A step-by-step plan for implementing this feature or fixing this bug
3. A list of files that likely need to be modified or created

Format your response in a way that would be helpful for a developer implementing this change.
    `;

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: claudePrompt }
      ]
    });

    const claudePlan = claudeResponse.content[0].text;

    // Create a PR with the Claude-generated plan
    console.log('Creating PR with Claude\'s plan');
    const prResponse = await octokit.pulls.create({
      owner,
      repo,
      title: `[Linear ${linearIssueId}] ${issueTitle}`,
      body: `## Linear Issue
[${linearIssueId}: ${issueTitle}](https://linear.app/issue/${linearIssueId})

## Claude's Analysis and Implementation Plan
${claudePlan}

---
This PR was automatically generated from Linear issue ${linearIssueId} using Claude.`,
      head: branchName,
      base: defaultBranch
    });

    const prUrl = prResponse.data.html_url;
    console.log(`PR created successfully: ${prUrl}`);
    
    console.log('Outputs:');
    console.log(`pr_url: ${prUrl}`);
    console.log(`branch_name: ${branchName}`);

  } catch (error) {
    console.error(`Action failed: ${error.message}`);
    console.error(error);
  }
}

console.log('Running test-local.js...');
run();