import type { LookRepositoryPort } from './ports';
import type { SavedLook } from '../domain/models';

export class LookStorageUseCases {
  constructor(private readonly repository: LookRepositoryPort) {}

  async listSavedLooks(): Promise<SavedLook[]> {
    const looks = await this.repository.listLooks();
    return [...looks].sort(
      (a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime(),
    );
  }

  async saveLook(look: SavedLook): Promise<void> {
    await this.repository.saveLook(look);
  }

  async removeLook(id: string): Promise<void> {
    await this.repository.deleteLook(id);
  }
}
