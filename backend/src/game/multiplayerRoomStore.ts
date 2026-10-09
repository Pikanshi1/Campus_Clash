import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";

export interface MultiplayerRoomStore {
  loadAll(): Promise<Array<{ code: string; state: Prisma.JsonValue; updatedAt: Date }>>;
  save(code: string, state: Prisma.InputJsonValue): Promise<void>;
  delete(code: string): Promise<void>;
}

export const postgresMultiplayerRoomStore: MultiplayerRoomStore = {
  async loadAll() {
    return prisma.multiplayerRoomSnapshot.findMany({
      select: { code: true, state: true, updatedAt: true },
    });
  },
  async save(code, state) {
    await prisma.multiplayerRoomSnapshot.upsert({
      where: { code },
      create: { code, state },
      update: { state },
    });
  },
  async delete(code) {
    await prisma.multiplayerRoomSnapshot.deleteMany({ where: { code } });
  },
};