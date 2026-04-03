export const generateId = (): string =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
