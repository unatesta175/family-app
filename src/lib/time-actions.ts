"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnProfile, getOwnProfileId } from "@/lib/auth";
import { TIME_CATEGORIES } from "@/lib/db/schema";
import { DAY_PRESETS, findOverlap, parseClock, starterBlocks, type Block } from "@/lib/time-planner";
import {
  addBlock,
  createRoutine,
  deleteBlock,
  deleteRoutine,
  getBlock,
  getBlocksForRoutines,
  getRoutine,
  getRoutines,
  renameRoutine,
  setDayRoutine,
  updateBlock,
  upsertTimeSettings,
  type RoutineRow,
} from "@/lib/db/repo-time";

export type TimeResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/goals/time");
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid input." };
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

async function requireOwnProfileId(): Promise<number> {
  const id = await getOwnProfileId();
  if (id === null) throw new Error("No profile for this account.");
  return id;
}

async function ownRoutine(id: number): Promise<RoutineRow> {
  const r = await getRoutine(id);
  if (!r) throw new Error("Routine not found.");
  await assertOwnProfile(r.profileId);
  return r;
}

const nameSchema = z.string().trim().min(1, "Give the routine a name.").max(30);

// --- Routines --------------------------------------------------------------------------------

/** Creates a routine, optionally as a copy of an existing one. */
export async function createRoutineAction(input: { name: string; copyFromId: number | null }): Promise<TimeResult> {
  try {
    const profileId = await requireOwnProfileId();
    const name = nameSchema.parse(input.name);
    const routine = await createRoutine(profileId, name);
    if (input.copyFromId) {
      const source = await ownRoutine(input.copyFromId);
      for (const b of await getBlocksForRoutines([source.id])) {
        await addBlock(routine.id, { startMin: b.startMin, endMin: b.endMin, category: b.category, label: b.label });
      }
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function renameRoutineAction(input: { id: number; name: string }): Promise<TimeResult> {
  try {
    await ownRoutine(input.id);
    await renameRoutine(input.id, nameSchema.parse(input.name));
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Deleting a routine leaves its days without one until you pick another. */
export async function deleteRoutineAction(id: number) {
  await ownRoutine(id);
  await deleteRoutine(id);
  refresh();
}

export async function setDayRoutineAction(input: { weekday: number; routineId: number | null }): Promise<TimeResult> {
  try {
    const v = z.object({ weekday: z.number().int().min(0).max(6), routineId: z.number().int().positive().nullable() }).parse(input);
    const profileId = await requireOwnProfileId();
    if (v.routineId !== null) await ownRoutine(v.routineId);
    await setDayRoutine(profileId, v.weekday, v.routineId);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** One tap to a sensible week shape: weekdays + weekend, or weekdays + Friday + weekend. */
export async function applyPresetAction(key: string): Promise<TimeResult> {
  try {
    const preset = DAY_PRESETS.find((p) => p.key === key);
    if (!preset) throw new Error("Unknown preset.");
    const profileId = await requireOwnProfileId();
    const existing = await getRoutines(profileId);
    const ids: number[] = [];
    for (const name of preset.routines) {
      const found = existing.find((r) => r.name.toLowerCase() === name.toLowerCase());
      ids.push(found ? found.id : (await createRoutine(profileId, name)).id);
    }
    for (let w = 0; w < 7; w++) await setDayRoutine(profileId, w, ids[preset.map[w]]);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** First-time setup: Weekday, Friday and Weekend routines filled with an editable sample day. */
export async function createStarterAction(): Promise<TimeResult> {
  try {
    const profileId = await requireOwnProfileId();
    if ((await getRoutines(profileId)).length > 0) throw new Error("You already have routines.");
    const kinds = [
      { name: "Weekday", kind: "weekday", days: [1, 2, 3, 4] },
      { name: "Friday", kind: "friday", days: [5] },
      { name: "Weekend", kind: "weekend", days: [6, 0] },
    ] as const;
    for (const k of kinds) {
      const routine = await createRoutine(profileId, k.name);
      for (const [from, to, category, label] of starterBlocks(k.kind)) {
        await addBlock(routine.id, { startMin: parseClock(from)!, endMin: parseClock(to)!, category, label });
      }
      for (const w of k.days) await setDayRoutine(profileId, w, routine.id);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// --- Blocks ----------------------------------------------------------------------------------

const blockSchema = z
  .object({
    routineId: z.number().int().positive(),
    startMin: z.number().int().min(0).max(1439),
    endMin: z.number().int().min(1).max(1440),
    category: z.enum(TIME_CATEGORIES),
    label: z.string().trim().max(40).nullable(),
  })
  .refine((v) => v.startMin !== v.endMin, { message: "The start and end can't be the same time.", path: ["endMin"] });

export type BlockFormInput = z.input<typeof blockSchema>;

async function checkRoom(routineId: number, range: { start: number; end: number }, ignoreId: number | null) {
  const blocks: Block[] = (await getBlocksForRoutines([routineId]))
    .filter((b) => b.id !== ignoreId)
    .map((b) => ({ id: b.id, start: b.startMin, end: b.endMin, category: b.category, label: b.label }));
  const clash = findOverlap(blocks, range);
  if (clash) {
    const name = clash.label?.trim() || clash.category;
    throw new Error(`That overlaps "${name}". Shorten it or move the other activity first.`);
  }
}

export async function addBlockAction(input: BlockFormInput): Promise<TimeResult> {
  try {
    const v = blockSchema.parse(input);
    await ownRoutine(v.routineId);
    await checkRoom(v.routineId, { start: v.startMin, end: v.endMin }, null);
    await addBlock(v.routineId, { startMin: v.startMin, endMin: v.endMin, category: v.category, label: v.label?.trim() || null });
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateBlockAction(id: number, input: BlockFormInput): Promise<TimeResult> {
  try {
    const v = blockSchema.parse(input);
    const block = await getBlock(id);
    if (!block) throw new Error("Activity not found.");
    await ownRoutine(block.routineId);
    if (v.routineId !== block.routineId) throw new Error("Can't move an activity to another routine.");
    await checkRoom(block.routineId, { start: v.startMin, end: v.endMin }, id);
    await updateBlock(id, { startMin: v.startMin, endMin: v.endMin, category: v.category, label: v.label?.trim() || null });
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteBlockAction(id: number) {
  const block = await getBlock(id);
  if (!block) return;
  await ownRoutine(block.routineId);
  await deleteBlock(id);
  refresh();
}

// --- Settings --------------------------------------------------------------------------------

export async function saveTimeSettingsAction(input: { birthDate: string | null; lifespanYears: number }): Promise<TimeResult> {
  try {
    const v = z
      .object({
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        lifespanYears: z.number().int().min(10, "Pick a lifespan of at least 10 years.").max(120, "Pick a lifespan of 120 years or less."),
      })
      .parse(input);
    if (v.birthDate && v.birthDate > new Date().toISOString().slice(0, 10)) throw new Error("The birth date can't be in the future.");
    const profileId = await requireOwnProfileId();
    await upsertTimeSettings(profileId, v.birthDate, v.lifespanYears);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
