/**
 * Frontend application entry point
 */

import { User, formatUserName, createSuccessResponse } from '@shared';

// Placeholder user data
const user: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Main application function
function main(): void {
  console.log('Frontend Application Started');

  // Demonstrate shared utilities
  const formattedName = formatUserName(user);
  console.log('Formatted user name:', formattedName);

  const response = createSuccessResponse(user);
  console.log('API Response:', response);

  console.log('Frontend application running successfully');
}

// Start the application
if (require.main === module) {
  main();
}

export { main };
