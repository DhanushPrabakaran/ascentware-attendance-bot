import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

const MAX_ENTRIES = 5000;
const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours - well beyond any realistic card interaction window

/**
 * Tracks in-flight/completed adaptive card interactions so a card action isn't processed
 * twice. Bounded and TTL-evicted (unlike the static Map/Set this replaces) so it can't grow
 * without limit over the process lifetime. Still process-local: on Render's single free-tier
 * instance today that's fine, but if the bot ever scales beyond one instance this needs to
 * move to a shared store (e.g. Redis) instead.
 */
@Injectable()
export class ActivityTrackerService {
  private readonly activityMap = new LRUCache<string, string>({
    max: MAX_ENTRIES,
    ttl: TTL_MS,
  });
  private readonly consumedIds = new LRUCache<string, true>({
    max: MAX_ENTRIES,
    ttl: TTL_MS,
  });
  private readonly processingIds = new Set<string>();

  setActivity(key: string, activityId: string) {
    this.activityMap.set(key, activityId);
  }

  getActivity(key: string): string | undefined {
    return this.activityMap.get(key);
  }

  markConsumed(activityId: string) {
    this.consumedIds.set(activityId, true);
  }

  isConsumed(activityId: string): boolean {
    return this.consumedIds.has(activityId);
  }

  isProcessing(activityId: string): boolean {
    return this.processingIds.has(activityId);
  }

  startProcessing(activityId: string) {
    this.processingIds.add(activityId);
  }

  finishProcessing(activityId: string) {
    this.processingIds.delete(activityId);
  }
}
