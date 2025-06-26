// utils/sites-config.js
// Site configuration and utilities for Clarity extension

const SITE_CONFIGS = {
  timeSinkSites: [
    'youtube.com',
    'reddit.com', 
    'twitter.com',
    'x.com',
    'instagram.com',
    'facebook.com',
    'tiktok.com',
    'linkedin.com',
    'pinterest.com',
    'snapchat.com',
    'discord.com',
    'twitch.tv',
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
    'primevideo.com'
  ],
  
  newsSites: [
    'cnn.com',
    'bbc.com',
    'nytimes.com',
    'washingtonpost.com',
    'guardian.com',
    'reuters.com',
    'ap.org',
    'npr.org',
    'wsj.com',
    'usatoday.com',
    'abcnews.go.com',
    'cbsnews.com',
    'nbcnews.com',
    'foxnews.com'
  ],
  
  workSites: [
    'gmail.com',
    'outlook.com',
    'drive.google.com',
    'docs.google.com',
    'sheets.google.com',
    'slides.google.com',
    'slack.com',
    'teams.microsoft.com',
    'zoom.us',
    'meet.google.com',
    'notion.so',
    'trello.com',
    'asana.com',
    'monday.com',
    'github.com',
    'gitlab.com',
    'stackoverflow.com'
  ],
  
  shoppingSites: [
    'amazon.com',
    'ebay.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'costco.com',
    'homedepot.com',
    'lowes.com',
    'macys.com',
    'nordstrom.com',
    'zappos.com',
    'etsy.com',
    'alibaba.com',
    'aliexpress.com'
  ]
};

const MOTIVATIONAL_QUOTES = [
  "The present moment is the only time over which we have dominion. - Thich Nhat Hanh",
  "Mindfulness is a way of befriending ourselves and our experience. - Jon Kabat-Zinn",
  "Wherever you are, be there totally. - Eckhart Tolle",
  "The best way to take care of the future is to take care of the present moment. - Thich Nhat Hanh",
  "Be present in all things and thankful for all things. - Maya Angelou",
  "Life is what happens while you are busy making other plans. - John Lennon",
  "The only way to make sense out of change is to plunge into it, move with it, and join the dance. - Alan Watts",
  "Yesterday is history, tomorrow is a mystery, today is a gift. - Eleanor Roosevelt",
  "The mind is everything. What you think you become. - Buddha",
  "Peace comes from within. Do not seek it without. - Buddha"
];

class SiteClassifier {
  /**
   * Classify a hostname into a category key
   * @param {string} hostname
   * @returns {string} key from SITE_CONFIGS or 'other'
   */
  static classify(hostname) {
    const domain = hostname.toLowerCase();
    
    for (const [category, sites] of Object.entries(SITE_CONFIGS)) {
      if (sites.some(site => domain.includes(site))) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Check if the site is considered a time sink
   * @param {string} hostname
   * @returns {boolean}
   */
  static isTimeSink(hostname) {
    return this.classify(hostname) === 'timeSinkSites';
  }

  /**
   * Get a user-friendly category name
   * @param {string} hostname
   * @returns {string}
   */
  static getSiteCategory(hostname) {
    const classification = this.classify(hostname);

    const categoryNames = {
      timeSinkSites: 'Social Media & Entertainment',
      newsSites: 'News & Information',
      workSites: 'Work & Productivity',
      shoppingSites: 'Shopping',
      other: 'Other'
    };

    return categoryNames[classification] || 'Other';
  }

  /**
   * Get a random motivational quote
   * @returns {string}
   */
  static getRandomQuote() {
    return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  }

  /**
   * Get all known domains as a flat list (optional utility)
   * @returns {string[]}
   */
  static getAllSites() {
    return Object.values(SITE_CONFIGS).flat();
  }
}

// Attach to global window if in browser context
if (typeof window !== 'undefined') {
  window.SiteClassifier = SiteClassifier;
  window.SITE_CONFIGS = SITE_CONFIGS;
  window.MOTIVATIONAL_QUOTES = MOTIVATIONAL_QUOTES;
}

// Export for modules
export { SiteClassifier, SITE_CONFIGS, MOTIVATIONAL_QUOTES };
