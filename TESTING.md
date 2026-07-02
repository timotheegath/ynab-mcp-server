# Testing the YNAB MCP Server

## Overview
This document explains how to test the YNAB MCP Server, including running tests, understanding the test structure, and managing YNAB API credentials.

## Running Tests

### Test Commands

```bash
npm install          # Install dependencies
npm test             # Run all tests once
npm run test:watch   # Run tests with file watching
npm run test:coverage # Run tests with coverage report
```

### Test Structure

- **Location**: Tests are located in `src/tests/`
- **Framework**: Vitest
- **Pattern**: Each tool has a corresponding test file (e.g., `ListBudgetsTool.ts` → `ListBudgetsTool.test.ts`)

### Test Examples

The tests follow a consistent pattern:

1. **Mocking**: The YNAB API is mocked using Vitest's mocking system
2. **Setup**: Each test sets up mock API responses
3. **Execution**: The tool's `execute` function is called with test inputs
4. **Assertions**: Results are verified against expected outputs

Example test structure:

```typescript
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import * as ynab from 'ynab';
import * as ToolName from '../tools/ToolName';

vi.mock('ynab');

describe('ToolName', () => {
  let mockApi: {
    // Define mock API structure
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup mock API
    mockApi = { /* mock implementation */ };
    (ynab.API as any).mockImplementation(() => mockApi);
    process.env.YNAB_API_TOKEN = 'test-token';
  });

  describe('execute', () => {
    it('should handle success case', async () => {
      // Setup mock response
      mockApi.someMethod.mockResolvedValue({ data: {} });
      
      // Execute tool
      const result = await ToolName.execute({}, mockApi as any);
      
      // Assert results
      expect(result).toEqual(expectedResult);
    });

    it('should handle error case', async () => {
      // Setup mock error
      mockApi.someMethod.mockRejectedValue(new Error('API Error'));
      
      // Execute tool
      const result = await ToolName.execute({}, mockApi as any);
      
      // Assert error handling
      expect(result.content[0].text).toContain('Error');
    });
  });
});
```

## YNAB API Credentials

### Environment Variables

The server requires the following environment variables:

- `YNAB_API_TOKEN` (required): Personal Access Token from YNAB API
- `YNAB_BUDGET_ID` (optional): Default budget ID

### Storing Test Credentials

For testing purposes, you should:

1. **Never commit real credentials** to version control
2. **Use test tokens** in your test environment
3. **Set environment variables** before running tests

#### Recommended Approach

1. Create a `.env.test` file in the project root:

```bash
YNAB_API_TOKEN=your_test_token_here
YNAB_BUDGET_ID=your_test_budget_id_here
```

2. Add `.env.test` to your `.gitignore` file

3. Load the environment variables before running tests:

```bash
# For one-time test run
cp .env.test .env && npm test

# Or use a package like dotenv
```

#### Alternative: Command Line

You can also set environment variables directly when running tests:

```bash
YNAB_API_TOKEN=your_test_token YNAB_BUDGET_ID=your_test_budget_id npm test
```

### Getting YNAB API Credentials

1. **Personal Access Token**:
   - Go to https://api.ynab.com/#personal-access-tokens
   - Generate a new personal access token
   - Copy the token (this is the only time it will be shown)

2. **Budget ID**:
   - Use the `ListBudgets` tool to get your budget ID
   - Or find it in the YNAB web app URL when viewing your budget

## Writing New Tests

### Test Coverage Guidelines

1. **Test both success and error cases**
2. **Test edge cases** (empty responses, special characters)
3. **Mock all external API calls**
4. **Verify input validation**
5. **Test error handling**

### Example: Adding a New Tool Test

1. Create a new test file in `src/tests/` following the naming pattern `ToolName.test.ts`
2. Follow the existing test structure
3. Mock the YNAB API methods your tool uses
4. Test various scenarios including:
   - Successful API responses
   - Empty or null responses
   - Error responses
   - Special characters in data
   - Missing required parameters

### Test Utilities

The project uses Vitest with the following utilities:
- `vi.mock()` - for mocking modules
- `vi.fn()` - for creating mock functions
- `vi.clearAllMocks()` - to reset mocks between tests
- `expect()` - for assertions

## Debugging Tests

### Common Issues

1. **Mock not working**: Ensure you've called `vi.mock('ynab')` at the top of your test file
2. **Environment variables missing**: Set `YNAB_API_TOKEN` in your test environment
3. **Type errors**: Ensure your mock API structure matches the expected YNAB API structure

### Debugging Tips

1. Use `console.log()` in tests (Vitest shows console output)
2. Run individual tests with `npm run test:watch` and filter by test name
3. Check the Vitest documentation for advanced debugging techniques

## Continuous Integration

For CI/CD pipelines:

1. Set `YNAB_API_TOKEN` as a secret environment variable in your CI system
2. Run `npm test` as part of your build pipeline
3. Consider running `npm run test:coverage` and enforcing minimum coverage thresholds

## Best Practices

1. **Keep tests isolated**: Each test should be independent
2. **Test behavior, not implementation**: Focus on what the tool does, not how it does it
3. **Make tests deterministic**: Avoid randomness in tests
4. **Keep tests fast**: Mock external dependencies to avoid network calls
5. **Update tests with code changes**: When you change tool behavior, update the corresponding tests

## Test Coverage

To check test coverage:

```bash
npm run test:coverage
```

This will generate a coverage report showing which parts of your code are covered by tests.

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [YNAB API Documentation](https://api.ynab.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
