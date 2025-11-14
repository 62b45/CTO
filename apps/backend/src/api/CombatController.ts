/**
 * Combat Controller - API endpoints for combat simulation
 */

import { Request, Response } from 'express';
import {
  CombatSimulationRequest,
  CombatSimulationResponse,
  EnemyTemplate,
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '@shared';
import { CombatService } from '../combat/CombatService';

export class CombatController {
  private combatService: CombatService;

  constructor() {
    this.combatService = new CombatService();
  }

  /**
   * Simulate combat between player and enemy
   * POST /api/combat/simulate
   */
  simulateCombat = async (req: Request, res: Response): Promise<void> => {
    try {
      const simulationRequest: CombatSimulationRequest = req.body;

      // Validate request
      if (!this.validateSimulationRequest(simulationRequest)) {
        res.status(400).json(
          createErrorResponse('Invalid combat simulation request')
        );
        return;
      }

      // Simulate combat
      const result: CombatSimulationResponse = 
        this.combatService.simulateCombat(simulationRequest);

      res.status(200).json(
        createSuccessResponse(result)
      );
    } catch (error) {
      console.error('Combat simulation error:', error);
      res.status(500).json(
        createErrorResponse('Combat simulation failed')
      );
    }
  };

  /**
   * Get all available enemy templates
   * GET /api/combat/enemies
   */
  getEnemyTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const enemies: EnemyTemplate[] = this.combatService.getEnemyTemplates();
      res.status(200).json(
        createSuccessResponse(enemies)
      );
    } catch (error) {
      console.error('Get enemy templates error:', error);
      res.status(500).json(
        createErrorResponse('Failed to retrieve enemy templates')
      );
    }
  };

  /**
   * Get specific enemy template by ID
   * GET /api/combat/enemies/:id
   */
  getEnemyTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const enemy = this.combatService.getEnemyTemplate(id);

      if (!enemy) {
        res.status(404).json(
          createErrorResponse(`Enemy template '${id}' not found`)
        );
        return;
      }

      res.status(200).json(
        createSuccessResponse(enemy)
      );
    } catch (error) {
      console.error('Get enemy template error:', error);
      res.status(500).json(
        createErrorResponse('Failed to retrieve enemy template')
      );
    }
  };

  /**
   * Get recent combat logs for a player
   * GET /api/combat/logs/:playerId
   */
  getPlayerCombatLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { playerId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const logs = this.combatService.getPlayerCombatLogs(playerId, limit);
      res.status(200).json(
        createSuccessResponse(logs)
      );
    } catch (error) {
      console.error('Get player combat logs error:', error);
      res.status(500).json(
        createErrorResponse('Failed to retrieve combat logs')
      );
    }
  };

  /**
   * Get specific combat session logs
   * GET /api/combat/logs/:playerId/:combatId
   */
  getCombatLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { playerId, combatId } = req.params;
      const logs = this.combatService.getCombatLogs(playerId, combatId);

      if (!logs) {
        res.status(404).json(
          createErrorResponse('Combat session not found')
        );
        return;
      }

      res.status(200).json(
        createSuccessResponse(logs)
      );
    } catch (error) {
      console.error('Get combat logs error:', error);
      res.status(500).json(
        createErrorResponse('Failed to retrieve combat logs')
      );
    }
  };

  /**
   * Validate combat simulation request
   */
  private validateSimulationRequest(request: CombatSimulationRequest): boolean {
    if (!request.playerId || !request.playerStats || !request.playerWeapon) {
      return false;
    }

    if (!request.enemyTemplateId) {
      return false;
    }

    // Validate player stats
    const stats = request.playerStats;
    if (typeof stats.health !== 'number' || 
        typeof stats.maxHealth !== 'number' ||
        typeof stats.attack !== 'number' ||
        typeof stats.defense !== 'number' ||
        typeof stats.speed !== 'number') {
      return false;
    }

    // Validate weapon
    const weapon = request.playerWeapon;
    if (!weapon.id || !weapon.name || 
        typeof weapon.baseDamage !== 'number' ||
        typeof weapon.multiplier !== 'number') {
      return false;
    }

    return true;
  }
}