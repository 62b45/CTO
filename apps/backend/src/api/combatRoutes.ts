/**
 * Combat API Routes
 */

import { Router } from 'express';
import { CombatController } from './CombatController';

export function createCombatRoutes(): Router {
  const router = Router();
  const combatController = new CombatController();

  // Combat simulation
  router.post('/simulate', combatController.simulateCombat);

  // Enemy templates
  router.get('/enemies', combatController.getEnemyTemplates);
  router.get('/enemies/:id', combatController.getEnemyTemplate);

  // Combat logs
  router.get('/logs/:playerId', combatController.getPlayerCombatLogs);
  router.get('/logs/:playerId/:combatId', combatController.getCombatLogs);

  return router;
}
