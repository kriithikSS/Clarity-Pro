// utils/storage.js
// Storage utility functions for Clarity extension

class ClarityStorage {
  /**
   * Get values from chrome.storage.local
   * @param {string[] | string} keys
   * @returns {Promise<Object>}
   */
  static async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  /**
   * Set values to chrome.storage.local
   * @param {Object} data
   * @returns {Promise<void>}
   */
  static async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  /**
   * Delete specific keys from storage
   * @param {string[] | string} keys
   * @returns {Promise<void>}
   */
  static async delete(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    });
  }

  /**
   * Get synced extension settings (with defaults)
   * @returns {Promise<Object>}
   */
  static async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'loopDetection',
        'doomscrollPrevention',
        'speedBumps',
        'emotionCheckins',
        'loopThreshold',
        'scrollTimeThreshold',
        'tabOverloadThreshold'
      ], (result) => {
        // Set fallback defaults
        const settings = {
          loopDetection: result.loopDetection !== false,
          doomscrollPrevention: result.doomscrollPrevention !== false,
          speedBumps: result.speedBumps !== false,
          emotionCheckins: result.emotionCheckins !== false,
          loopThreshold: result.loopThreshold || 5,
          scrollTimeThreshold: result.scrollTimeThreshold || 10,
          tabOverloadThreshold: result.tabOverloadThreshold || 15
        };
        resolve(settings);
      });
    });
  }

  /**
   * Append an entry to a log and cap to 100 items
   * @param {string} type
   * @param {Object} data
   */
  static async logActivity(type, data) {
    const key = `${type}Log`;
    const existing = await this.get([key]);
    const log = existing[key] || [];

    log.push({
      ...data,
      timestamp: Date.now()
    });

    // Keep only last 100 entries
    if (log.length > 100) {
      log.splice(0, log.length - 100);
    }

    await this.set({ [key]: log });
  }

  /**
   * Get logs filtered by last X days
   * @param {number} days
   * @returns {Promise<Object>}
   */
  static async getActivityStats(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const data = await this.get([
      'loopDetectionLog',
      'scrollSessionLog',
      'moodLog',
      'emotionLog'
    ]);

    const filterRecent = (log) => (log || []).filter(item => item.timestamp > cutoff);

    return {
      loopDetections: filterRecent(data.loopDetectionLog),
      scrollSessions: filterRecent(data.scrollSessionLog),
      moods: filterRecent(data.moodLog),
      emotions: filterRecent(data.emotionLog)
    };
  }

  /**
   * Remove entries older than N days (default: 30 days)
   * @param {number} daysToKeep
   */
  static async clearOldData(daysToKeep = 30) {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const logKeys = [
      'loopDetectionLog',
      'scrollSessionLog',
      'moodLog',
      'emotionLog'
    ];

    const data = await this.get(logKeys);
    const cleanedData = {};

    logKeys.forEach(key => {
      const log = data[key] || [];
      cleanedData[key] = log.filter(item => item.timestamp > cutoff);
    });

    await this.set(cleanedData);
  }
}

// Expose globally (for content scripts)
if (typeof window !== 'undefined') {
  window.ClarityStorage = ClarityStorage;
}

// For module systems
export default ClarityStorage;
