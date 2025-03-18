// This script allows you to test the action locally with mock data
// Run with: node test-mock.js

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function run() {
  try {
    console.log('Starting mock test...');
    
    // Mock Linear issue data
    const issueTitle = "Add user authentication feature";
    const issueDescription = "We need to implement user authentication using OAuth2. This should include login, logout, and session management. Users should be able to log in with their Google or GitHub accounts.";
    const linearIssueId = "ABC-123";
    
    console.log(`Using mock Linear issue: ${linearIssueId} - ${issueTitle}`);

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
    
    // Check if Claude is installed, otherwise use mock response
    try {
      const claudeVersion = execSync('claude --version', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log(`Found Claude version: ${claudeVersion.trim()}`);
      
      // Try to run Claude with the prompt file
      claudePlan = execSync(`claude -p "think deeply about this implementation" "${promptFilePath}"`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log('Claude successfully analyzed the issue!');
    } catch (err) {
      console.warn(`Warning: Could not run Claude Code CLI: ${err.message}`);
      console.log('Using mock response instead...');
      
      // Mock Claude response
      claudePlan = `
# Implementation Plan for User Authentication Feature

## Summary
This feature requires implementing OAuth2-based user authentication that allows users to log in using their Google or GitHub accounts, manage their sessions, and log out securely. We'll need to build authentication flows, user session management, and integrate with OAuth2 providers.

## Implementation Plan

### 1. Set Up OAuth2 Provider Integrations
- Register application with Google OAuth2 and GitHub OAuth2 services
- Store client IDs and secrets securely in environment variables
- Create OAuth2 configuration module to manage provider settings

### 2. Create Authentication Backend
- Implement OAuth2 authorization endpoints
- Create callback handlers for OAuth providers
- Develop token validation and refresh mechanisms
- Implement secure session management
- Create logout functionality

### 3. Build User Management System
- Design user model that stores OAuth provider information
- Implement user profile retrieval from OAuth providers
- Create mechanisms to link accounts from multiple providers

### 4. Develop Frontend Components
- Build login page with OAuth provider buttons
- Create user profile component
- Implement secure session storage in frontend
- Add authentication state management
- Build logout functionality

### 5. Add Authorization System
- Implement role-based access control
- Create protected route mechanisms
- Add authorization middleware

## File Changes

### Backend Files
- \`/config/auth.js\` - New file for auth configuration
- \`/models/User.js\` - New user model file
- \`/controllers/authController.js\` - New controller for auth endpoints
- \`/routes/auth.js\` - New routes for authentication
- \`/middleware/auth.js\` - New middleware for authentication
- \`/services/tokenService.js\` - New service for token management

### Frontend Files
- \`/src/components/Login.jsx\` - New login component
- \`/src/components/Profile.jsx\` - New profile component
- \`/src/context/AuthContext.jsx\` - New auth context for state management
- \`/src/services/auth.js\` - New auth service for API calls
- \`/src/hooks/useAuth.js\` - New custom hook for auth state
- \`/src/routes/ProtectedRoute.jsx\` - New component for route protection

## Technical Considerations

### Security Implications
- Implement CSRF protection for auth endpoints
- Use HTTPS for all communication
- Store tokens securely, preferably in HTTP-only cookies
- Implement proper OAuth state parameter validation
- Set secure and SameSite attributes for cookies
- Consider rate limiting on auth endpoints to prevent brute force

### Performance Considerations
- Optimize token validation to minimize database queries
- Consider caching user permissions
- Implement efficient session revocation mechanism

### Edge Cases
- Handle account merging when same user authenticates with different providers
- Manage expired/invalid tokens gracefully
- Handle OAuth provider downtime
- Consider user role changes during active sessions

### Testing Approach
- Unit tests for authentication logic and controllers
- Integration tests for OAuth flows using provider test accounts
- E2E tests for complete login/logout flows
- Security testing including penetration testing
- Test cases for invalid/expired tokens and session management
      `;
    }

    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`Removed temporary directory: ${tempDir}`);
    } catch (err) {
      console.warn(`Warning: Could not remove temporary directory ${tempDir}: ${err.message}`);
    }

    // Print the analysis
    console.log('\n=== Claude Analysis ===\n');
    console.log(claudePlan);
    console.log('\n=== End Analysis ===\n');
    
    console.log('Test completed successfully!');
    console.log('In a real scenario, this would create a PR with this analysis.');

  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    console.error(error);
  }
}

console.log('Running test-mock.js...');
run();