import type { EquipmentSlot, EquippedItem } from '@shared';
import type { EconomyService } from '../economy/service';
import type { InventoryRepository } from '../storage/inventoryRepository';

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

export interface PlayerEquipmentState {
  playerId: string;
  equipped: Record<EquipmentSlot, EquippedItem | null>;
}

// Helper function to determine slot from item type
function getSlotForItemType(itemType: string): EquipmentSlot | null {
  switch (itemType.toUpperCase()) {
    case 'WEAPON':
      return 'WEAPON' as EquipmentSlot;
    case 'ARMOR':
      return 'ARMOR' as EquipmentSlot;
    case 'ACCESSORY':
      return 'ACCESSORY_1' as EquipmentSlot;
    default:
      return null;
  }
}

export class EquipmentService {
  private equipment: Map<string, PlayerEquipmentState> = new Map();

  constructor(
    private readonly economyService: EconomyService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly logger: Logger = console
  ) {}

  async getOrCreateEquipment(
    playerId: string
  ): Promise<PlayerEquipmentState> {
    if (this.equipment.has(playerId)) {
      return this.equipment.get(playerId)!;
    }

    const equipment: PlayerEquipmentState = {
      playerId,
      equipped: {
        WEAPON: null,
        ARMOR: null,
        ACCESSORY_1: null,
        ACCESSORY_2: null,
        ACCESSORY_3: null,
      },
    };

    this.equipment.set(playerId, equipment);
    return equipment;
  }

  async equip(
    playerId: string,
    itemId: string,
    slot?: EquipmentSlot
  ): Promise<{
    equipped: EquippedItem | null;
    unequipped: EquippedItem | null;
  }> {
    const inventory = await this.economyService.getOrCreateInventory(
      playerId
    );
    const equipment = await this.getOrCreateEquipment(playerId);

    // Find the item in inventory
    const inventoryItem = inventory.items.find((i: any) => i.itemId === itemId);
    if (!inventoryItem) {
      throw new Error(`Item not found in inventory: ${itemId}`);
    }

    // Determine the slot - use provided slot or try to infer from item type
    let targetSlot = slot;
    if (!targetSlot) {
      // Default to WEAPON if no slot specified
      targetSlot = 'WEAPON' as EquipmentSlot;
    }

    // Create equipped item with default bonuses
    const equippedItem: EquippedItem = {
      slot: targetSlot,
      itemId,
      name: inventoryItem.name,
      bonuses: {},
    };

    // Unequip previous item at this slot
    const previousItem = equipment.equipped[targetSlot];

    // Update equipment
    equipment.equipped[targetSlot] = equippedItem;
    this.equipment.set(playerId, equipment);

    this.logger.info(
      `Player ${playerId} equipped ${inventoryItem.name} in ${targetSlot}`
    );

    return {
      equipped: equippedItem,
      unequipped: previousItem,
    };
  }

  async unequip(
    playerId: string,
    slot: EquipmentSlot
  ): Promise<EquippedItem | null> {
    const equipment = await this.getOrCreateEquipment(playerId);
    const unequippedItem = equipment.equipped[slot];

    if (unequippedItem) {
      equipment.equipped[slot] = null;
      this.equipment.set(playerId, equipment);

      this.logger.info(
        `Player ${playerId} unequipped ${unequippedItem.name} from ${slot}`
      );
    }

    return unequippedItem;
  }

  async getEquipped(playerId: string): Promise<PlayerEquipmentState> {
    return this.getOrCreateEquipment(playerId);
  }

  calculateBonuses(equipment: PlayerEquipmentState): Record<string, number> {
    const bonuses: Record<string, number> = {};

    for (const item of Object.values(equipment.equipped)) {
      if (item) {
        for (const [key, value] of Object.entries(item.bonuses)) {
          bonuses[key] = (bonuses[key] ?? 0) + value;
        }
      }
    }

    return bonuses;
  }

  getSlotAvailability(
    equipment: PlayerEquipmentState,
    itemType: string
  ): EquipmentSlot[] {
    switch (itemType.toUpperCase()) {
      case 'WEAPON':
        return ['WEAPON' as EquipmentSlot];
      case 'ARMOR':
        return ['ARMOR' as EquipmentSlot];
      case 'ACCESSORY':
        return [
          'ACCESSORY_1' as EquipmentSlot,
          'ACCESSORY_2' as EquipmentSlot,
          'ACCESSORY_3' as EquipmentSlot,
        ].filter(slot => !equipment.equipped[slot]);
      default:
        return [];
    }
  }
}
