// utils/analytics.js
// Analytics utility for Clarity extension

class ClarityAnalytics {
  static async trackEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      domain: window.location?.hostname || 'unknown',
      ...data
    };

    await ClarityStorage.logActivity('event', event); // Optional: can remove if unused
  }

  static async getInsights(days = 7) {
    const stats = await ClarityStorage.getActivityStats(days);

    return {
      totalLoopDetections: stats.loopDetections.length,
      totalScrollSessions: stats.scrollSessions.length,
      averageMood: this.calculateAverageMood(stats.moods),
      topDistractionSites: this.getTopSites(stats.loopDetections),
      moodTrends: this.analyzeMoodTrends(stats.moods),
      timeSpentByCategory: this.analyzeTimeByCategory(stats.scrollSessions),
      weeklyProgress: this.calculateWeeklyProgress(stats)
    };
  }

  static calculateAverageMood(moods) {
    if (moods.length === 0) return null;

    const sum = moods.reduce((total, mood) => total + mood.rating, 0);
    return (sum / moods.length).toFixed(1);
  }

  static getTopSites(loopDetections) {
    const siteCounts = {};

    loopDetections.forEach(detection => {
      const domain = detection.domain || 'unknown';
      siteCounts[domain] = (siteCounts[domain] || 0) + 1;
    });

    return Object.entries(siteCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));
  }

  static analyzeMoodTrends(moods) {
    if (moods.length < 2) return null;

    const sortedMoods = moods.sort((a, b) => a.timestamp - b.timestamp);
    const recent = sortedMoods.slice(-5);
    const older = sortedMoods.slice(-10, -5);

    if (older.length === 0) return null;

    const recentAvg = recent.reduce((sum, mood) => sum + mood.rating, 0) / recent.length;
    const olderAvg = older.reduce((sum, mood) => sum + mood.rating, 0) / older.length;

    const trend = recentAvg - olderAvg;

    return {
      direction: trend > 0.2 ? 'improving' : trend < -0.2 ? 'declining' : 'stable',
      change: trend.toFixed(1)
    };
  }

  static analyzeTimeByCategory(sessions) {
    const categoryTime = {};

    sessions.forEach(session => {
      const category = SiteClassifier.getSiteCategory(session.domain);
      categoryTime[category] = (categoryTime[category] || 0) + (session.duration || 0);
    });

    const total = Object.values(categoryTime).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(categoryTime)
      .map(([category, time]) => ({
        category,
        time: Math.round(time / (1000 * 60)), // minutes
        percentage: Math.round((time / total) * 100)
      }))
      .sort((a, b) => b.time - a.time);
  }

  static calculateWeeklyProgress(stats) {
    const thisWeek = {
      loopDetections: stats.loopDetections.length,
      longScrollSessions: stats.scrollSessions.filter(s => s.duration > 10 * 60 * 1000).length
    };

    return {
      thisWeek,
      improvement: null // Optional: add past-week comparison logic
    };
  }
}

// Expose globally for popup/content access
if (typeof window !== 'undefined') {
  window.ClarityAnalytics = ClarityAnalytics;
}

// Optional export if you're bundling
export default ClarityAnalytics;
