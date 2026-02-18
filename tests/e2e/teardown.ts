import { PostalClient } from '../../src/lib/postal-client';

const cleanupIds = new Set<string>();

export function registerCleanup(messageId: string): void {
  cleanupIds.add(messageId);
}

export async function cleanupMessages(client: PostalClient): Promise<void> {
  const ids = Array.from(cleanupIds);
  cleanupIds.clear();

  await Promise.allSettled(
    ids.map(async (id) => {
      try {
        await client.deleteMessage(id);
      } catch {
        // Best effort cleanup for test environment.
      }
    })
  );
}
