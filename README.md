# Linear to PR with Claude Code

This GitHub Action automates creating pull requests from Linear issues using Claude Code CLI to analyze the issue and generate an implementation plan.

## Features

- Fetches issue details from Linear
- Uses Claude Code CLI with extended thinking to analyze the issue and create an implementation plan
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
          # Install the Claude CLI
          curl -sL "https://anthropic.com/claude-cli/install" | bash -s -- -b ~/.local/bin
          
          # Add to PATH for this job
          echo "$HOME/.local/bin" >> $GITHUB_PATH
          
          # Configure Claude CLI with API key
          mkdir -p ~/.config/anthropic
          cat > ~/.config/anthropic/config.json << EOF
          {
            "api_key": "${{ secrets.CLAUDE_API_KEY }}"
          }
          EOF
          
          # Set permissions
          chmod 600 ~/.config/anthropic/config.json
          
          # Verify installation
          claude --version
      
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
3. Run `npm run test:local`

## Custom Claude Code Command

This project includes a custom Claude Code slash command that you can use to manually analyze Linear issues:

```bash
# Inside a Claude Code session
/project:analyze-issue "Title: Feature X, Description: Implement feature X to do Y"
```

This will invoke the custom command to analyze the issue and generate an implementation plan.

### Setting Up Custom Commands

To create your own custom commands:

1. Create a `.claude/commands` directory in your project
2. Add markdown files with your command templates
3. Use `$ARGUMENTS` placeholder to capture additional input

For example, create `.claude/commands/my-command.md` with:
```
Analyze this code: $ARGUMENTS
```

Then use it in Claude Code with:
```
/project:my-command "code to analyze here"
```

## How It Works

1. The action fetches issue details from Linear using the Linear API
2. It creates a temporary prompt file for Claude Code
3. Claude Code with extended thinking analyzes the issue and generates a detailed implementation plan
4. The action creates a new branch named after the Linear issue
5. It opens a PR with Claude's analysis and implementation plan

## License

MIT