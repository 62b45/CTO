/**
 * Backend application entry point
 */

import { User, isValidEmail, Config } from '@shared';

// Placeholder configuration
const config: Config = {
  apiUrl: 'http://localhost:3000',
  environment: 'development',
  features: {
    authentication: true,
    analytics: false,
  },
};

// Placeholder user service
class UserService {
  private users: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  getAllUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | undefined {
    return this.users.find(user => user.id === id);
  }

  validateUserEmail(email: string): boolean {
    return isValidEmail(email);
  }
}

// Main application function
function main(): void {
  console.log('Backend Application Started');
  console.log('Environment:', config.environment);
  console.log('Features:', config.features);

  const userService = new UserService();

  // Demonstrate functionality
  const allUsers = userService.getAllUsers();
  console.log('Total users:', allUsers.length);

  const user = userService.getUserById('1');
  if (user) {
    console.log('Found user:', user.name);
    console.log('Email valid:', userService.validateUserEmail(user.email));
  }

  console.log('Backend application running successfully');
}

// Start the application
if (require.main === module) {
  main();
}

export { main, UserService };
