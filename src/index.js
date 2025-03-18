const core = require('@actions/core');
const github = require('@actions/github');
const { LinearClient } = require('@linear/sdk');
const { Anthropic } = require('@anthropic-ai/sdk');

async function run() {
  try {
    // Get inputs
    const linearApiKey = core.getInput('linear_api_key', { required: true });
    const linearIssueId = core.getInput('linear_issue_id', { required: true });
    const githubToken = core.getInput('github_token', { required: true });
    const claudeApiKey = core.getInput('claude_api_key', { required: true });

    // Initialize clients
    const linearClient = new LinearClient({ apiKey: linearApiKey });
    const octokit = github.getOctokit(githubToken);
    const anthropic = new Anthropic({ apiKey: claudeApiKey });

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
    const repoDetails = await octokit.rest.repos.get({
      owner: repo.owner,
      repo: repo.repo
    });
    
    const defaultBranch = repoDetails.data.default_branch;
    console.log(`Default branch is: ${defaultBranch}`);
    
    // Get reference to HEAD of default branch
    const refResponse = await octokit.rest.git.getRef({
      owner: repo.owner,
      repo: repo.repo,
      ref: `heads/${defaultBranch}`
    });
    
    const sha = refResponse.data.object.sha;
    
    // Create a new branch
    console.log(`Creating branch: ${branchName}`);
    await octokit.rest.git.createRef({
      owner: repo.owner,
      repo: repo.repo,
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
    const prResponse = await octokit.rest.pulls.create({
      owner: repo.owner,
      repo: repo.repo,
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
    
    core.setOutput('pr_url', prUrl);
    core.setOutput('branch_name', branchName);

  } catch (error) {
    core.setFailed(error.message);
    console.error(error);
  }
}

run();