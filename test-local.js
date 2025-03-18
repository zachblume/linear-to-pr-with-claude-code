// This script allows you to test the action locally
// Create a .env file based on .env.example and run with: node test-local.js

require('dotenv').config();

const { LinearClient } = require('@linear/sdk');
const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function run() {
  try {
    // Get inputs from environment variables
    const linearApiKey = process.env.LINEAR_API_KEY;
    const linearIssueId = process.env.LINEAR_ISSUE_ID;
    const githubToken = process.env.GITHUB_TOKEN;

    // Check required inputs
    if (!linearApiKey) throw new Error('LINEAR_API_KEY is required');
    if (!linearIssueId) throw new Error('LINEAR_ISSUE_ID is required');
    if (!githubToken) throw new Error('GITHUB_TOKEN is required');

    // Initialize clients
    const linearClient = new LinearClient({ apiKey: linearApiKey });
    const octokit = new Octokit({ auth: githubToken });

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

    // Create a temporary directory for Claude Code to work with
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-code-'));
    console.log(`Created temporary directory: ${tempDir}`);

    // Create a prompt file for Claude Code
    const promptFilePath = path.join(tempDir, 'prompt.md');
    fs.writeFileSync(promptFilePath, `
# Linear Issue Analysis

I need you to analyze a Linear issue and create a plan to implement it. Here are the details:

## Issue Details

Title: ${issueTitle}
Description: ${issueDescription}

## Requirements

Based on this issue, please provide:

1. A concise summary of what needs to be implemented (2-3 sentences)
2. A detailed step-by-step implementation plan
3. A list of files that likely need to be modified or created
4. Any potential challenges or considerations

Format your response as Markdown with clear headings.
`);

    // Run Claude Code CLI
    console.log('Running Claude Code to analyze the issue...');
    let claudePlan;
    try {
      claudePlan = execSync(`claude-cli ${promptFilePath}`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
    } catch (err) {
      // Fallback to claude command if claude-cli is not available
      try {
        claudePlan = execSync(`claude ${promptFilePath}`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
      } catch (innerErr) {
        throw new Error(`Failed to run Claude Code CLI: ${innerErr.message}. Make sure claude-cli is installed.`);
      }
    }

    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`Removed temporary directory: ${tempDir}`);
    } catch (err) {
      console.warn(`Warning: Could not remove temporary directory ${tempDir}: ${err.message}`);
    }

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
This PR was automatically generated from Linear issue ${linearIssueId} using Claude Code.`,
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