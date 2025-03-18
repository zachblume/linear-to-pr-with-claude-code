# Linear to PR with Claude Code

This GitHub Action automates creating pull requests from Linear issues using Claude Code CLI to analyze the issue and generate an implementation plan.

## Features

- Fetches issue details from Linear
- Uses Claude Code CLI to analyze the issue and generate an implementation plan
- Creates a new branch for the PR
- Opens a pull request with the Claude-generated plan

## Requirements

- Claude Code CLI must be installed and configured in your GitHub Actions environment
- Linear API key for accessing issue details
- GitHub token for creating branches and PRs

## Usage

```yaml
name: Linear to PR

on:
  workflow_dispatch:
    inputs:
      linear_issue_id:
        description: 'Linear Issue ID'
        required: true
        type: string

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Claude CLI
        run: |
          # Install Claude CLI (Replace with actual installation command)
          curl -sL https://github.com/anthropics/anthropic-cli/releases/latest/download/install.sh | bash
          # Configure Claude CLI
          echo "${{ secrets.CLAUDE_API_KEY }}" > ~/.config/anthropic/config.json
      
      - name: Linear to PR with Claude
        uses: zachblume/linear-to-pr-with-claude-code@v1
        with:
          linear_api_key: ${{ secrets.LINEAR_API_KEY }}
          linear_issue_id: ${{ github.event.inputs.linear_issue_id }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `linear_api_key` | Your Linear API key | Yes |
| `linear_issue_id` | ID of the Linear issue to process | Yes |
| `github_token` | GitHub token for API access | Yes |

## Outputs

| Output | Description |
|--------|-------------|
| `pr_url` | URL of the created PR |
| `branch_name` | Name of the branch created for the PR |

## Setup

1. Create the following secrets in your GitHub repository:
   - `LINEAR_API_KEY`: Your Linear API key
   - `CLAUDE_API_KEY`: Your Anthropic API key for Claude CLI

2. Ensure your workflow includes the steps to install and configure Claude Code CLI.

3. Create a workflow file that uses this action, either triggered manually or by other events.

## Local Testing

To test this action locally:

1. Install Claude Code CLI and configure it
2. Create a `.env` file based on `.env.example` with your API keys
3. Run `node test-local.js`

## License

MIT