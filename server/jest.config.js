module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  modulePathIgnorePatterns: ['<rootDir>/uploads/'],
  verbose: true,
  testTimeout: 35000
};
