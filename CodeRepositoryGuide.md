# Code Repository Guide

This guide provides best practices for working with code repositories in the AgentMinder project, including when to use different approaches for GitHub interactions.

## Git and GitHub Best Practices

### Repository Structure

- Keep the repository structure clean and intuitive
- Use meaningful directory names that reflect their purpose
- Place configuration files at the repository root
- Group related files in dedicated directories

### Branching Strategy

- `main` branch should always be deployable
- Create feature branches for new development
- Use semantic branch naming: `feature/feature-name`, `fix/issue-name`, etc.
- Delete branches after they're merged

### Commit Practices

- Make small, focused commits
- Write clear commit messages with a concise summary line
- Reference issue numbers in commit messages when applicable
- Ensure each commit builds and passes tests

### Pull Requests

- Create descriptive PR titles and descriptions
- Link PRs to related issues
- Request reviews from relevant team members
- Address all review comments before merging

## Command Line vs. MCP Approach

### Command Line Git Benefits

The command line interaction with Git and GitHub offers several advantages:

1. **Performance**: The command line is significantly faster and more responsive, especially with:

   - Larger repositories
   - Multiple file operations
   - Complex merge scenarios

2. **Reliability**: Direct Git commands have:

   - Fewer points of failure
   - Clearer error messages
   - Consistent behavior
   - Well-documented solutions for common issues

3. **Flexibility**: Command line Git provides:

   - Full access to all Git features
   - Support for advanced operations like rebasing, cherry-picking
   - Integration with hooks and scripts
   - Custom aliases for common workflows

4. **Feedback**: Git commands provide:

   - Immediate, detailed feedback
   - Clear status information
   - Ability to see exactly what changes are staged

5. **Control**: Command line gives you:

   - Precise control over what's committed
   - Ability to amend commits
   - Fine-grained staging with partial file changes
   - Better conflict resolution tools

6. **Security**: For sensitive projects like AgentMinder:
   - Works seamlessly with pre-commit hooks for security scans
   - Better handling of large files
   - More reliable gitignore enforcement

### When to Use MCP (Managed Code Panel) Integration

The MCP GitHub integration can be useful in specific scenarios:

1. **Quick, Simple Operations**:

   - Creating a single file in a repository
   - Making a small edit to an existing file
   - Viewing repository content

2. **One-off Contributions**:

   - Contributing to a project you don't plan to work on regularly
   - Avoiding setting up a local environment for minor changes

3. **Documentation Updates**:

   - Making small documentation changes
   - Editing markdown files that don't require testing

4. **Issue/PR Management**:

   - Creating or commenting on issues
   - Managing pull requests
   - Quick repository exploration

5. **Teaching/Demonstration**:

   - Showing someone how to interact with GitHub
   - Simplifying the GitHub workflow for beginners

6. **Emergency Fixes**:
   - Making critical updates when you don't have local access
   - Quick hotfixes that are self-contained

## Security Considerations

When working with repositories containing sensitive information:

1. Always use the command line Git approach for:

   - Projects with pre-commit hooks for security scanning
   - Repositories with encryption mechanisms
   - Codebases containing environment configurations

2. Never use MCP for:

   - Pushing code that might contain unscanned sensitive data
   - Projects where security is critical
   - Repositories with complex .gitignore requirements

3. Security best practices:
   - Always run security scanners before commits
   - Verify what's being staged before each commit
   - Never commit tokens, passwords, or keys
   - Use the encryption utilities provided with AgentMinder

## Setting Up a New Environment

To set up a new development environment:

1. Clone the repository:

   ```bash
   git clone git@github.com:spar65/AgentMinder.git
   cd AgentMinder
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up pre-commit hooks:

   ```bash
   npm run prepare
   ```

4. Copy the `.encryption-key` file (if needed for encrypted content)

5. Create your local environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration
   ```

## Common Git Commands

### Basic Workflow

```bash
# Update your local repo
git pull

# Create a new branch
git checkout -b feature/new-feature

# Stage changes
git add .

# Commit changes
git commit -m "Add new feature"

# Push to remote
git push -u origin feature/new-feature
```

### Viewing Status and History

```bash
# Check status
git status

# View commit history
git log

# View changes
git diff

# View staged changes
git diff --staged
```

### Branch Management

```bash
# List branches
git branch

# Switch branch
git checkout branch-name

# Merge a branch
git merge branch-name

# Delete a branch
git branch -d branch-name
```

## Troubleshooting

### Common Issues

1. **Push rejected due to non-fast-forward**:

   ```bash
   git pull --rebase origin main
   git push
   ```

2. **Merge conflicts**:

   ```bash
   # After resolving conflicts in editor
   git add <resolved-files>
   git commit
   ```

3. **Undo last commit (keep changes)**:

   ```bash
   git reset --soft HEAD~1
   ```

4. **Discard uncommitted changes**:

   ```bash
   git checkout -- <file>
   # or
   git restore <file>
   ```

5. **Fix security scan issues**:
   ```bash
   npm run scan
   # Then commit again
   ```

## Conclusion

For the AgentMinder project, the command line Git approach is strongly recommended for most development tasks due to its performance, reliability, and security benefits. The MCP integration should be reserved for quick, simple tasks where convenience outweighs the need for full Git functionality.

When in doubt, especially when working with code that might contain sensitive information, always use the command line approach with our built-in security tools.
