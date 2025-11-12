import type { Player, PlayerSession } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { PlayerSummary } from '../schemas/api';

const ACTIVE_SESSION_STATUS = 'ACTIVE';

const createDefaultPlayerName = (playerId: string) => {
  const alphanumericSuffix = playerId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = alphanumericSuffix.slice(-4) || '0000';
  return `Adventurer-${suffix}`;
};

export interface PlayerContext {
  player: Player;
  session: PlayerSession;
}

class PlayerService {
  async ensurePlayer(playerId: string): Promise<Player> {
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (existingPlayer) {
      return existingPlayer;
    }

    return prisma.player.create({
      data: {
        id: playerId,
        name: createDefaultPlayerName(playerId),
      },
    });
  }

  async ensureActiveSession(playerId: string): Promise<PlayerSession> {
    const existingSession = await prisma.playerSession.findFirst({
      where: {
        playerId,
        status: ACTIVE_SESSION_STATUS,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (existingSession) {
      return prisma.playerSession.update({
        where: { id: existingSession.id },
        data: { lastActiveAt: new Date() },
      });
    }

    return prisma.playerSession.create({
      data: {
        playerId,
        status: ACTIVE_SESSION_STATUS,
      },
    });
  }

  async getPlayerContext(playerId: string): Promise<PlayerContext> {
    const player = await this.ensurePlayer(playerId);
    const session = await this.ensureActiveSession(player.id);

    return { player, session };
  }

  async getPlayerSummary(playerId: string): Promise<PlayerSummary> {
    const { player, session } = await this.getPlayerContext(playerId);

    return this.mapToSummary(player, session);
  }

  mapToSummary(player: Player, session: PlayerSession): PlayerSummary {
    return {
      id: player.id,
      name: player.name,
      createdAt: player.createdAt.toISOString(),
      updatedAt: player.updatedAt.toISOString(),
      stats: {
        level: player.level,
        experience: player.experience,
        health: {
          current: player.health,
          max: player.maxHealth,
        },
        energy: {
          current: player.energy,
          max: player.maxEnergy,
        },
        gold: player.gold,
      },
      session: {
        id: session.id,
        status: (session.status ?? ACTIVE_SESSION_STATUS) as 'ACTIVE' | 'COMPLETED',
        lastActiveAt: session.lastActiveAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
    };
  }
}

export const playerService = new PlayerService();
