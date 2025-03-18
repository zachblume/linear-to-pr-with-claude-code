const core = require('@actions/core');
const github = require('@actions/github');
const { LinearClient } = require('@linear/sdk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function run() {
  try {
    // Get inputs
    const linearApiKey = core.getInput('linear_api_key', { required: true });
    const linearIssueId = core.getInput('linear_issue_id', { required: true });
    const githubToken = core.getInput('github_token', { required: true });

    // Initialize clients
    const linearClient = new LinearClient({ apiKey: linearApiKey });
    const octokit = github.getOctokit(githubToken);

    // Get repository info
    const context = github.context;
    const repo = context.repo;

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
      owner: repo.owner,
      repo: repo.repo
    });
    
    const defaultBranch = repoDetails.data.default_branch;
    console.log(`Default branch is: ${defaultBranch}`);
    
    // Get reference to HEAD of default branch
    const refResponse = await octokit.git.getRef({
      owner: repo.owner,
      repo: repo.repo,
      ref: `heads/${defaultBranch}`
    });
    
    const sha = refResponse.data.object.sha;
    
    // Create a new branch
    console.log(`Creating branch: ${branchName}`);
    await octokit.git.createRef({
      owner: repo.owner,
      repo: repo.repo,
      ref: `refs/heads/${branchName}`,
      sha: sha
    });

    // Create a temporary directory for Claude Code to work with
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-code-'));
    console.log(`Created temporary directory: ${tempDir}`);

    // Create a prompt file for Claude Code
    const promptFilePath = path.join(tempDir, 'prompt.md');
    fs.writeFileSync(promptFilePath, `
# Linear Issue Implementation Plan

## Issue Details

Title: ${issueTitle}
Description: ${issueDescription}

## Task

I need you to analyze this Linear issue and create a comprehensive implementation plan. As a senior software engineer, think deeply about the most effective approach to implement this feature or fix this bug.

## Requirements

Please provide:

1. **Summary**: A concise explanation of what needs to be implemented (2-3 sentences)
2. **Implementation Plan**: A detailed step-by-step plan including:
   - Key components or functions that need to be created or modified
   - Data models or schemas that need to be updated
   - API endpoints that need to be added or modified
   - UI changes if applicable
3. **File Changes**: A specific list of files that will likely need to be modified or created
4. **Technical Considerations**: 
   - Potential edge cases to handle
   - Performance considerations
   - Security implications
   - Testing approach

Format your response as Markdown with clear headings and bullet points for easy readability.
`);

    // Run Claude Code CLI with extended thinking
    console.log('Running Claude Code to analyze the issue...');
    let claudePlan;
    try {
      // Use the correct claude command format with file input
      claudePlan = execSync(`claude -p "think deeply about this implementation" "${promptFilePath}"`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      console.warn(`Warning: Error running claude command: ${err.message}`);
      // Try alternative method with cat
      try {
        claudePlan = execSync(`cat "${promptFilePath}" | claude -p "think deeply about this implementation"`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (innerErr) {
        // Fallback to basic command without extended thinking
        try {
          claudePlan = execSync(`claude "${promptFilePath}"`, {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            stdio: ['pipe', 'pipe', 'pipe']
          });
        } catch (finalErr) {
          throw new Error(`Failed to run Claude Code CLI: ${finalErr.message}. Make sure claude is installed and configured properly.`);
        }
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
      owner: repo.owner,
      repo: repo.repo,
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
    
    core.setOutput('pr_url', prUrl);
    core.setOutput('branch_name', branchName);

  } catch (error) {
    core.setFailed(error.message);
    console.error(error);
  }
}

run();