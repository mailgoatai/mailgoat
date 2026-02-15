/**
 * Jest setup for integration tests
 * Configures global test environment and utilities
 */

import nock from 'nock';

// Disable real HTTP requests during tests
beforeAll(() => {
  nock.disableNetConnect();
  // Allow localhost connections for potential local testing
  nock.enableNetConnect('127.0.0.1');
});

// Clean up after all tests
afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

// Clean up nock interceptors after each test
afterEach(() => {
  nock.cleanAll();
});

// Increase timeout for integration tests
jest.setTimeout(10000);
