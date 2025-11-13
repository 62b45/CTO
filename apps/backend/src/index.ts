/**
 * Backend application entry point
 */

import express from 'express';
import { User, isValidEmail, Config } from '@shared';
import { createCombatRoutes } from './api/combatRoutes';

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

// Create Express application
function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/combat', createCombatRoutes());

  // User endpoints (placeholder)
  app.get('/api/users', (req, res) => {
    const userService = new UserService();
    const users = userService.getAllUsers();
    res.json(users);
  });

  app.get('/api/users/:id', (req, res) => {
    const userService = new UserService();
    const user = userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
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

  // Start Express server
  const app = createApp();
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /api/users');
    console.log('  GET  /api/users/:id');
    console.log('  POST /api/combat/simulate');
    console.log('  GET  /api/combat/enemies');
    console.log('  GET  /api/combat/enemies/:id');
    console.log('  GET  /api/combat/logs/:playerId');
    console.log('  GET  /api/combat/logs/:playerId/:combatId');
  });

  console.log('Backend application running successfully');
}

// Start the application
if (require.main === module) {
  main();
}

export { main, UserService, createApp };
