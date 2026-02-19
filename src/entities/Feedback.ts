export type FeedbackCreateInput = {
  type: string;
  message: string;
  email: string | null;
};

type StoredFeedback = FeedbackCreateInput & {
  id: string;
  createdAt: string;
};

const STORAGE_KEY = "finanzvergleich_feedback";

export class Feedback {
  static async create(input: FeedbackCreateInput): Promise<void> {
    const item: StoredFeedback = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const current = Feedback._readAll();
    current.unshift(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }

  private static _readAll(): StoredFeedback[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StoredFeedback[]) : [];
    } catch {
      return [];
    }
  }
}
