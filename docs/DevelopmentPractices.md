# Development Practices for Agent Minder

This document outlines the development best practices to be followed when working on the Agent Minder project.

## Code Quality

### TypeScript

- Use TypeScript for all new code to ensure type safety
- Configure strict mode in `tsconfig.json`
- Define explicit types for function parameters and return values
- Use interfaces for complex object shapes
- Avoid using `any` type unless absolutely necessary

### Coding Style

- Follow the ESLint and Prettier configurations
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Use camelCase for variables and functions, PascalCase for classes and interfaces
- Add JSDoc comments for functions and classes
- Use async/await instead of callbacks or raw Promises
- Avoid deep nesting of conditionals and loops

## Architecture

### Project Structure

- Follow the established directory structure:
  - `/src`: Source code
    - `/config`: Configuration files
    - `/controllers`: API route handlers
    - `/middleware`: Express middleware
    - `/models`: Database models
    - `/routes`: API routes
    - `/services`: Business logic
    - `/utils`: Utility functions
    - `/types`: TypeScript type definitions
  - `/tests`: Test files
    - `/unit`: Unit tests
    - `/integration`: Integration tests
  - `/docs`: Documentation

### Separation of Concerns

- Controllers: Handle HTTP requests and responses
- Services: Implement business logic
- Models: Define data structure and database interaction
- Routes: Define API endpoints
- Middleware: Process requests before they reach the route handlers
- Utils: Provide utility functions used across the application

## Testing

### Test-Driven Development

- Write tests before implementing new features when possible
- Maintain high test coverage (aim for at least 80%)
- Test the public API of modules, not implementation details

### Test Types

- Unit Tests: Test individual functions and classes in isolation
- Integration Tests: Test the interaction between components
- API Tests: Test the API endpoints from the outside

### Testing Best Practices

- Use descriptive test names that explain what is being tested
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies
- Keep tests independent of each other
- Avoid test duplication

## Git Workflow

### Branching Strategy

- `main`: Production-ready code
- `develop`: Next release development
- Feature branches: `feature/feature-name`
- Bug fix branches: `fix/bug-name`
- Release branches: `release/version`

### Commit Messages

- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation only changes
  - `style`: Changes that do not affect the meaning of the code
  - `refactor`: A code change that neither fixes a bug nor adds a feature
  - `perf`: A code change that improves performance
  - `test`: Adding missing tests or correcting existing tests
  - `chore`: Changes to the build process or auxiliary tools

### Pull Requests

- Keep pull requests small and focused on a single feature or bug fix
- Reference related issues in the pull request description
- Ensure all tests pass
- Get code reviewed by at least one other developer
- Squash commits before merging

## Error Handling

- Use a consistent error handling approach
- Utilize the custom `ApiError` class for HTTP errors
- Log errors with appropriate severity levels
- Return standardized error responses from the API
- Handle unexpected errors gracefully

## Security

- Store sensitive information in environment variables
- Validate and sanitize user input
- Implement proper authentication and authorization
- Use HTTPS for production deployments
- Keep dependencies up to date to avoid security vulnerabilities
- Follow the principle of least privilege

## Performance

- Optimize database queries with appropriate indexes
- Implement pagination for list endpoints
- Use caching for expensive operations
- Monitor application performance
- Optimize your code for the critical path

## Continuous Integration and Deployment

- Use GitHub Actions for CI/CD
- Run tests automatically on push and pull requests
- Lint code as part of the CI process
- Automate the deployment process
- Use environment-specific configurations

## Documentation

- Keep README up to date
- Document API endpoints with OpenAPI/Swagger
- Include JSDoc comments for functions and classes
- Create documentation for complex business logic
- Document setup and deployment processes

## Dependencies

- Keep dependencies to a minimum
- Regularly update dependencies
- Use exact versions in package.json
- Audit dependencies for security issues

## Monitoring and Logging

- Implement structured logging with Winston
- Include relevant context in log messages
- Use different log levels appropriately
- Monitor application health and performance
- Set up alerts for critical issues

### Logging System Architecture

The application uses a comprehensive logging system built with Winston:

1. **Central Logger Configuration**:

   - Defined in `src/utils/logger.ts`
   - Exports `loggerService` for application-wide use
   - Configures appropriate transports based on environment

2. **Log Levels**:

   - `error`: Critical issues affecting functionality
   - `warn`: Potential issues or edge cases
   - `info`: General operational information
   - `debug`: Detailed information for troubleshooting
   - `verbose`: More detailed information than debug

3. **Contextual Logging**:

   - Always include relevant metadata with logs
   - Add request IDs for tracking requests through the system
   - Include user/agent IDs when available
   - For errors, include the full error object

4. **Database Logging**:

   - All database models use the `mongooseLogger` plugin
   - Automatically logs document operations
   - Captures operation type, collection, document ID
   - Records errors with full stack traces

5. **Request Logging**:
   - `loggingMiddleware` logs all API requests
   - `responseTimeMiddleware` tracks response times
   - Logs include method, path, status code, and timing

### Best Practices for Logging

1. **When to Use Each Log Level**:

   - `error`: Service failures, unexpected exceptions
   - `warn`: Handled errors, validation failures
   - `info`: Service startup, major operations
   - `debug`: Input/output values, operation details
   - `verbose`: Detailed flow information

2. **Adding Context to Logs**:

   ```typescript
   // Good - includes context
   loggerService.info('User permission updated', {
     userId: user.id,
     permission: newPermission,
     requestId: req.id,
   });

   // Bad - lacks context
   loggerService.info('Permission updated');
   ```

3. **Error Logging**:

   ```typescript
   try {
     // Operation that might fail
   } catch (error) {
     loggerService.error('Failed to process payment', {
       error, // Include the full error object
       userId: user.id,
       amount: payment.amount,
     });
     throw error; // Rethrow or handle appropriately
   }
   ```

4. **Security Considerations**:
   - Never log sensitive information (passwords, tokens, etc.)
   - Sanitize user input before logging
   - Be careful with error messages that might reveal system details

By following these practices, we will maintain comprehensive logging that helps with debugging, performance monitoring, and audit trails throughout the application.

By following these best practices, we will maintain a high-quality, maintainable, and secure codebase for the Agent Minder project.
