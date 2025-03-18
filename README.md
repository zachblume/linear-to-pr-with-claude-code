# Linear to PR with Claude

This GitHub Action automates creating pull requests from Linear issues using Claude AI to analyze the issue and generate an implementation plan.

## Features

- Fetches issue details from Linear
- Uses Claude AI to analyze the issue and generate an implementation plan
- Creates a new branch for the PR
- Opens a pull request with the Claude-generated plan

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
      
      - name: Linear to PR with Claude
        uses: your-username/claude-github-action@v1
        with:
          linear_api_key: ${{ secrets.LINEAR_API_KEY }}
          linear_issue_id: ${{ github.event.inputs.linear_issue_id }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          claude_api_key: ${{ secrets.CLAUDE_API_KEY }}
```

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `linear_api_key` | Your Linear API key | Yes |
| `linear_issue_id` | ID of the Linear issue to process | Yes |
| `github_token` | GitHub token for API access | Yes |
| `claude_api_key` | Anthropic API key for Claude | Yes |

## Outputs

| Output | Description |
|--------|-------------|
| `pr_url` | URL of the created PR |
| `branch_name` | Name of the branch created for the PR |

## Setup

1. Create the following secrets in your GitHub repository:
   - `LINEAR_API_KEY`: Your Linear API key
   - `CLAUDE_API_KEY`: Your Anthropic API key for Claude

2. Create a workflow file that uses this action, either triggered manually or by other events.

## License

MIT