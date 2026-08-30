export const GIFT_CATEGORIES = [
  { id: 'love', label: 'Love', emoji: '💞' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'food', label: 'Food', emoji: '🍽️' },
  { id: 'celebration', label: 'Celebration', emoji: '🎉' },
  { id: 'support', label: 'Support', emoji: '🤝' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'achievement', label: 'Achievement', emoji: '🏆' },
  { id: 'community', label: 'Community', emoji: '🌍' },
  { id: 'wellness', label: 'Wellness', emoji: '✨' },
] as const;

export const GIFT_ITEMS = [
  { id: 'gift-01', name: 'Blush Bloom', emoji: '🌷', priceLD: 50, category: 'love' },
  { id: 'gift-02', name: 'Sweet Heart', emoji: '💗', priceLD: 60, category: 'love' },
  { id: 'gift-03', name: 'Rose Aura', emoji: '🌹', priceLD: 80, category: 'love' },
  { id: 'gift-04', name: 'Love Letter', emoji: '💌', priceLD: 90, category: 'love' },
  { id: 'gift-05', name: 'Cupid Crown', emoji: '👑', priceLD: 100, category: 'love' },
  { id: 'gift-06', name: 'Hope Basket', emoji: '🧺', priceLD: 120, category: 'support' },
  { id: 'gift-07', name: 'Kindness Pack', emoji: '🤝', priceLD: 140, category: 'support' },
  { id: 'gift-08', name: 'Village Blessing', emoji: '🙏', priceLD: 160, category: 'support' },
  { id: 'gift-09', name: 'Power Boost', emoji: '⚡', priceLD: 180, category: 'support' },
  { id: 'gift-10', name: 'Helping Hand', emoji: '🫶', priceLD: 200, category: 'support' },
  { id: 'gift-11', name: 'Sunrise Petal', emoji: '🌼', priceLD: 50, category: 'nature' },
  { id: 'gift-12', name: 'Forest Calm', emoji: '🌿', priceLD: 70, category: 'nature' },
  { id: 'gift-13', name: 'Leaf Blessing', emoji: '🍃', priceLD: 90, category: 'nature' },
  { id: 'gift-14', name: 'Rainforest Glow', emoji: '🌴', priceLD: 110, category: 'nature' },
  { id: 'gift-15', name: 'Golden Horizon', emoji: '🌅', priceLD: 150, category: 'nature' },
  { id: 'gift-16', name: 'Market Feast', emoji: '🍲', priceLD: 60, category: 'food' },
  { id: 'gift-17', name: 'Palm Rice', emoji: '🍚', priceLD: 80, category: 'food' },
  { id: 'gift-18', name: 'Jolly Cake', emoji: '🎂', priceLD: 100, category: 'food' },
  { id: 'gift-19', name: 'Cocoa Joy', emoji: '🍫', priceLD: 130, category: 'food' },
  { id: 'gift-20', name: 'Feast Table', emoji: '🍽️', priceLD: 170, category: 'food' },
  { id: 'gift-21', name: 'Party Pop', emoji: '🎉', priceLD: 70, category: 'celebration' },
  { id: 'gift-22', name: 'Confetti Burst', emoji: '🎊', priceLD: 100, category: 'celebration' },
  { id: 'gift-23', name: 'Birthday Star', emoji: '⭐', priceLD: 130, category: 'celebration' },
  { id: 'gift-24', name: 'Victory Bell', emoji: '🔔', priceLD: 160, category: 'celebration' },
  { id: 'gift-25', name: 'Grand Finale', emoji: '🏆', priceLD: 200, category: 'celebration' },
  { id: 'gift-26', name: 'Street Beat', emoji: '🎵', priceLD: 80, category: 'music' },
  { id: 'gift-27', name: 'Studio Spark', emoji: '🎧', priceLD: 100, category: 'music' },
  { id: 'gift-28', name: 'Vibe Mix', emoji: '🎶', priceLD: 120, category: 'music' },
  { id: 'gift-29', name: 'Sound Wave', emoji: '🔊', priceLD: 150, category: 'music' },
  { id: 'gift-30', name: 'Live Stage', emoji: '🎤', priceLD: 200, category: 'music' },
  { id: 'gift-31', name: 'Travel Bag', emoji: '🧳', priceLD: 90, category: 'travel' },
  { id: 'gift-32', name: 'Airport Pass', emoji: '🎫', priceLD: 110, category: 'travel' },
  { id: 'gift-33', name: 'Coastline Escape', emoji: '🏖️', priceLD: 150, category: 'travel' },
  { id: 'gift-34', name: 'Sky Route', emoji: '✈️', priceLD: 200, category: 'travel' },
  { id: 'gift-35', name: 'Global Glow', emoji: '🌍', priceLD: 250, category: 'travel' },
  { id: 'gift-36', name: 'First Win', emoji: '🥇', priceLD: 80, category: 'achievement' },
  { id: 'gift-37', name: 'Momentum Star', emoji: '🌟', priceLD: 120, category: 'achievement' },
  { id: 'gift-38', name: 'Silver Goal', emoji: '🥈', priceLD: 160, category: 'achievement' },
  { id: 'gift-39', name: 'Champion Crown', emoji: '🏆', priceLD: 220, category: 'achievement' },
  { id: 'gift-40', name: 'Legend Medal', emoji: '🏅', priceLD: 300, category: 'achievement' },
  { id: 'gift-41', name: 'Hometown Pride', emoji: '🏡', priceLD: 75, category: 'community' },
  { id: 'gift-42', name: 'Community Cheer', emoji: '👏', priceLD: 110, category: 'community' },
  { id: 'gift-43', name: 'Neighborhood Lift', emoji: '🧡', priceLD: 140, category: 'community' },
  { id: 'gift-44', name: 'Unity Circle', emoji: '🤝', priceLD: 190, category: 'community' },
  { id: 'gift-45', name: 'Together Crown', emoji: '👨‍👩‍👧‍👦', priceLD: 260, category: 'community' },
  { id: 'gift-46', name: 'Peace Euphoria', emoji: '🕊️', priceLD: 90, category: 'wellness' },
  { id: 'gift-47', name: 'Calm Wave', emoji: '🌊', priceLD: 120, category: 'wellness' },
  { id: 'gift-48', name: 'Glow Ritual', emoji: '✨', priceLD: 170, category: 'wellness' },
  { id: 'gift-49', name: 'Mindful Crown', emoji: '👁️', priceLD: 220, category: 'wellness' },
  { id: 'gift-50', name: 'Luxury Calm', emoji: '💎', priceLD: 500, category: 'wellness' },
] as const;

export function validateCreatorEligibility(followerCount: number | string, minimumFollowers: number | string = 1000): boolean {
  const count = Number(followerCount || 0);
  return Number.isFinite(count) && count >= Number(minimumFollowers || 0);
}

export function isValidOrangeMoneyNumber(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const cleaned = value.trim().replace(/\s+/g, '');
  if (!cleaned) return false;
  if (cleaned.startsWith('+231')) {
    const tail = cleaned.slice(4);
    return /^\d{8,11}$/.test(tail) && tail.length >= 8 && tail.length <= 11;
  }
  if (cleaned.startsWith('07')) {
    return /^07\d{8,12}$/.test(cleaned) && cleaned.length >= 10 && cleaned.length <= 13;
  }
  return false;
}

export function generateUSSD(orangeMoneyNumber: string, amountLD: number | string): string {
  const cleaned = String(orangeMoneyNumber || '').trim().replace(/\s+/g, '');
  const normalizedNumber = cleaned.startsWith('+231') ? cleaned.replace(/^\+231/, '231') : cleaned;
  const value = Math.max(0, Math.round(Number(amountLD || 0)));
  return `*144*2*1*1*${normalizedNumber}*${value}#`;
}

export default {
  GIFT_CATEGORIES,
  GIFT_ITEMS,
  validateCreatorEligibility,
  isValidOrangeMoneyNumber,
  generateUSSD,
};
