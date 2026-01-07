/**
 * Application configuration
 * Demo Mode hides internal tools for client alpha.
 */

export const config = {
  /**
   * When true, hides internal/lab functionality:
   * - AI Agent selection, Manage AI Agents, Export AI Agent, Advanced Export
   * - Batch Processing tab (not functional yet)
   */
  demoMode: import.meta.env.VITE_DEMO_MODE !== 'false',
};
