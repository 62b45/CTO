import { PlayerProgression, PlayerStats, CombatStats, EnemyTemplate } from '@shared';

// Test data factories for creating consistent test objects
export class TestDataFactory {
  static createPlayerStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
    return {
      level: 1,
      health: 100,
      maxHealth: 100,
      attack: 10,
      defense: 8,
      speed: 10,
      strength: 10,
      agility: 10,
      intelligence: 10,
      statPoints: 0,
      ...overrides,
    };
  }

  static createCombatStats(overrides: Partial<CombatStats> = {}): CombatStats {
    return {
      health: 100,
      maxHealth: 100,
      attack: 10,
      defense: 8,
      speed: 10,
      ...overrides,
    };
  }

  static createPlayerProgression(overrides: Partial<PlayerProgression> = {}): PlayerProgression {
    return {
      id: 'test-player',
      stats: this.createPlayerStats(),
      experience: 0,
      totalExperience: 0,
      levelHistory: [],
      achievements: [],
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createEnemyTemplate(overrides: Partial<EnemyTemplate> = {}): EnemyTemplate {
    return {
      id: 'test-enemy',
      name: 'Test Enemy',
      stats: this.createCombatStats(),
      weapon: {
        id: 'test-weapon',
        name: 'Test Weapon',
        baseDamage: 10,
        multiplier: 1.0,
      },
      rewards: {
        experience: 25,
        gold: 10,
      },
      ...overrides,
    };
  }

  static createGoblinEnemy(): EnemyTemplate {
    return this.createEnemyTemplate({
      id: 'goblin',
      name: 'Goblin',
      stats: this.createCombatStats({
        health: 50,
        maxHealth: 50,
        attack: 8,
        defense: 5,
        speed: 12,
      }),
      weapon: {
        id: 'rusty_dagger',
        name: 'Rusty Dagger',
        baseDamage: 5,
        multiplier: 1.0,
      },
      rewards: {
        experience: 25,
        gold: 10,
      },
    });
  }

  static createOrcEnemy(): EnemyTemplate {
    return this.createEnemyTemplate({
      id: 'orc',
      name: 'Orc Warrior',
      stats: this.createCombatStats({
        health: 100,
        maxHealth: 100,
        attack: 15,
        defense: 10,
        speed: 8,
      }),
      weapon: {
        id: 'iron_axe',
        name: 'Iron Axe',
        baseDamage: 12,
        multiplier: 1.2,
      },
      rewards: {
        experience: 75,
        gold: 30,
      },
    });
  }

  static createDragonEnemy(): EnemyTemplate {
    return this.createEnemyTemplate({
      id: 'dragon',
      name: 'Ancient Dragon',
      stats: this.createCombatStats({
        health: 300,
        maxHealth: 300,
        attack: 35,
        defense: 20,
        speed: 15,
      }),
      weapon: {
        id: 'dragon_breath',
        name: 'Dragon Breath',
        baseDamage: 25,
        multiplier: 1.5,
      },
      rewards: {
        experience: 500,
        gold: 200,
        items: ['dragon_scale', 'fire_essence'],
      },
    });
  }
}

// Statistical analysis utilities
export class StatisticalAnalyzer {
  static mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  static median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  static standardDeviation(values: number[]): number {
    const mean = this.mean(values);
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  static percentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  static distributionAnalysis(values: number[]): {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    p25: number;
    p75: number;
    p90: number;
    p99: number;
  } {
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: this.mean(values),
      median: this.median(values),
      stdDev: this.standardDeviation(values),
      p25: this.percentile(values, 25),
      p75: this.percentile(values, 75),
      p90: this.percentile(values, 90),
      p99: this.percentile(values, 99),
    };
  }

  static chiSquareTest(observed: number[], expected: number[]): number {
    if (observed.length !== expected.length) {
      throw new Error('Observed and expected arrays must have same length');
    }

    return observed.reduce((chiSquare, obs, index) => {
      const exp = expected[index];
      if (exp === 0) return chiSquare;
      return chiSquare + Math.pow(obs - exp, 2) / exp;
    }, 0);
  }

  static isDistributionBalanced(
    observed: Record<string, number>,
    expected: Record<string, number>,
    significance: number = 0.05
  ): boolean {
    const observedValues = Object.values(observed);
    const expectedValues = Object.values(expected);
    
    const chiSquare = this.chiSquareTest(observedValues, expectedValues);
    const degreesOfFreedom = observedValues.length - 1;
    
    // Critical value for chi-square at 5% significance (simplified)
    const criticalValue = degreesOfFreedom * 3.84; // Approximation
    
    return chiSquare < criticalValue;
  }
}

// Balance validation utilities
export class BalanceValidator {
  static validateExperienceCurve(levels: number[], experiencePerLevel: number[]): {
    isBalanced: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for exponential growth (should be roughly polynomial)
    for (let i = 2; i < experiencePerLevel.length; i++) {
      const growthRate = experiencePerLevel[i] / experiencePerLevel[i - 1];
      if (growthRate > 2.5) {
        issues.push(`Level ${i} has excessive XP growth (${growthRate.toFixed(2)}x)`);
        recommendations.push(`Consider reducing XP requirement for level ${i}`);
      }
      if (growthRate < 1.2) {
        issues.push(`Level ${i} has insufficient XP growth (${growthRate.toFixed(2)}x)`);
        recommendations.push(`Consider increasing XP requirement for level ${i}`);
      }
    }

    // Check total time to reach max level (assuming 100 XP per hour)
    const totalXP = experiencePerLevel.reduce((sum, xp) => sum + xp, 0);
    const hoursRequired = totalXP / 100;
    if (hoursRequired > 1000) { // > 1000 hours is too much
      issues.push(`Total time to max level: ${hoursRequired.toFixed(0)} hours (too high)`);
      recommendations.push('Reduce overall XP requirements');
    }
    if (hoursRequired < 100) { // < 100 hours is too little
      issues.push(`Total time to max level: ${hoursRequired.toFixed(0)} hours (too low)`);
      recommendations.push('Increase overall XP requirements');
    }

    return {
      isBalanced: issues.length === 0,
      issues,
      recommendations,
    };
  }

  static validateCombatBalance(
    playerWinRates: Record<string, number>,
    acceptableRange: { min: number; max: number } = { min: 0.3, max: 0.7 }
  ): {
    isBalanced: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    for (const [enemy, winRate] of Object.entries(playerWinRates)) {
      if (winRate < acceptableRange.min) {
        issues.push(`${enemy} win rate too low: ${(winRate * 100).toFixed(1)}%`);
        recommendations.push(`Reduce ${enemy} difficulty or increase rewards`);
      }
      if (winRate > acceptableRange.max) {
        issues.push(`${enemy} win rate too high: ${(winRate * 100).toFixed(1)}%`);
        recommendations.push(`Increase ${enemy} difficulty or reduce rewards`);
      }
    }

    return {
      isBalanced: issues.length === 0,
      issues,
      recommendations,
    };
  }

  static validateLootboxProbabilities(
    observed: Record<string, number>,
    expected: Record<string, number>
  ): {
    isBalanced: boolean;
    chiSquare: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] [];

    // Check if observed matches expected distribution
    const isBalanced = StatisticalAnalyzer.isDistributionBalanced(observed, expected);
    
    if (!isBalanced) {
      const chiSquare = StatisticalAnalyzer.chiSquareTest(
        Object.values(observed),
        Object.values(expected)
      );
      
      issues.push(`Lootbox distribution doesn't match expected probabilities (χ²=${chiSquare.toFixed(2)})`);
      recommendations.push('Adjust random number generation or probability weights');
      
      // Check specific rarities
      for (const [rarity, count] of Object.entries(observed)) {
        const expectedCount = expected[rarity] || 0;
        const observedRate = count / Object.values(observed).reduce((sum, c) => sum + c, 0);
        const expectedRate = expectedCount / Object.values(expected).reduce((sum, c) => sum + c, 0);
        
        if (Math.abs(observedRate - expectedRate) > 0.05) { // 5% tolerance
          issues.push(`${rarity} rarity rate: ${(observedRate * 100).toFixed(1)}% (expected ${(expectedRate * 100).toFixed(1)}%)`);
        }
      }
    }

    return {
      isBalanced,
      chiSquare: StatisticalAnalyzer.chiSquareTest(
        Object.values(observed),
        Object.values(expected)
      ),
      issues,
      recommendations,
    };
  }
}

// Performance testing utilities
export class PerformanceTester {
  static async measureExecutionTime<T>(
    fn: () => T | Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; averageTime: number; totalTime: number }> {
    const times: number[] = [];
    let lastResult: T;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      lastResult = await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;

    return { result: lastResult!, averageTime, totalTime };
  }

  static validatePerformanceThresholds(
    metrics: Record<string, number>,
    thresholds: Record<string, number>
  ): {
    passed: boolean;
    violations: Array<{ metric: string; actual: number; threshold: number }>;
  } {
    const violations: Array<{ metric: string; actual: number; threshold: number }> = [];

    for (const [metric, actual] of Object.entries(metrics)) {
      const threshold = thresholds[metric];
      if (threshold && actual > threshold) {
        violations.push({ metric, actual, threshold });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }
}

// Mock data generators
export class MockDataGenerator {
  static generateRandomPlayerStats(level: number = 1): PlayerStats {
    const baseStats = TestDataFactory.createPlayerStats();
    const statPoints = (level - 1) * 3; // 3 points per level
    
    // Randomly allocate stat points
    const strength = baseStats.strength + Math.floor(Math.random() * statPoints);
    const remainingPoints = statPoints - (strength - baseStats.strength);
    const agility = baseStats.agility + Math.floor(Math.random() * remainingPoints);
    const intelligence = baseStats.intelligence + (remainingPoints - (agility - baseStats.agility));

    return {
      ...baseStats,
      level,
      health: 100 + (level - 1) * 10,
      maxHealth: 100 + (level - 1) * 10,
      attack: 10 + (level - 1) * 2,
      defense: 8 + (level - 1) * 1,
      speed: 10 + Math.floor((level - 1) * 0.5),
      strength,
      agility,
      intelligence,
      statPoints: 0,
    };
  }

  static generateCombatLog(entries: number = 10): Array<{
    id: string;
    timestamp: number;
    enemy: string;
    victory: boolean;
    experience: number;
    gold: number;
    duration: number;
  }> {
    const enemies = ['Goblin', 'Orc', 'Dragon', 'Wolf', 'Spider'];
    const logs = [];

    for (let i = 0; i < entries; i++) {
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      const victory = Math.random() > 0.3; // 70% win rate
      
      logs.push({
        id: `combat-${i}`,
        timestamp: Date.now() - (entries - i) * 60000, // 1 minute apart
        enemy,
        victory,
        experience: victory ? Math.floor(Math.random() * 100) + 20 : 0,
        gold: victory ? Math.floor(Math.random() * 50) + 10 : 0,
        duration: Math.floor(Math.random() * 60) + 30, // 30-90 seconds
      });
    }

    return logs;
  }

  static generateLootboxResults(count: number = 100): Array<{
    id: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    items: Array<{ id: string; name: string; value: number }>;
    openedAt: number;
  }> {
    const rarities: Array<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'> = [
      'common', 'uncommon', 'rare', 'epic', 'legendary'
    ];
    
    const results = [];

    for (let i = 0; i < count; i++) {
      const rarityRoll = Math.random();
      let rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      
      if (rarityRoll < 0.005) rarity = 'legendary'; // 0.5%
      else if (rarityRoll < 0.02) rarity = 'epic'; // 1.5%
      else if (rarityRoll < 0.1) rarity = 'rare'; // 8%
      else if (rarityRoll < 0.3) rarity = 'uncommon'; // 20%
      else rarity = 'common'; // 70%

      results.push({
        id: `lootbox-${i}`,
        rarity,
        items: [{
          id: `item-${i}`,
          name: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Item`,
          value: { common: 10, uncommon: 25, rare: 100, epic: 500, legendary: 2000 }[rarity],
        }],
        openedAt: Date.now() - (count - i) * 1000,
      });
    }

    return results;
  }
}