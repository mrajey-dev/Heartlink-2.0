// src/utils/vibeData.js — Curated Lifestyle Vibe System
export const ALL_VIBE_NODES = [
  { id: 'v1', name: 'Late Night Beats', icon: 'musical-notes', color: ['#A855F7', '#6366F1'], tagline: 'Vinyl & Lo-fi', onlineCount: 14 },
  { id: 'v2', name: 'Cafe Hop', icon: 'cafe', color: ['#F59E0B', '#EAB308'], tagline: 'Brews & Books', onlineCount: 9 },
  { id: 'v3', name: 'Nature Peak', icon: 'leaf', color: ['#10B981', '#14B8A6'], tagline: 'Trails & Camp', onlineCount: 11 },
  { id: 'v4', name: 'Gamer Zone', icon: 'game-controller', color: ['#EC4899', '#F43F5E'], tagline: 'Retro & Consoles', onlineCount: 18 },
  { id: 'v5', name: 'Art & Gallery', icon: 'brush', color: ['#06B6D4', '#3B82F6'], tagline: 'Galleries & Canvas', onlineCount: 7 },
  { id: 'v6', name: 'Foodie Club', icon: 'restaurant', color: ['#F97316', '#F59E0B'], tagline: 'Spices & Taste', onlineCount: 12 },
  { id: 'v7', name: 'Fitness Fit', icon: 'barbell', color: ['#FF2D55', '#FF9500'], tagline: 'Gym & Runs', onlineCount: 15 },
  { id: 'v8', name: 'Cinephile', icon: 'film', color: ['#007AFF', '#5856D6'], tagline: 'Indie & Classics', onlineCount: 8 },
  { id: 'v9', name: 'Tech & Dev', icon: 'code-working', color: ['#34C759', '#007AFF'], tagline: 'AI & Startups', onlineCount: 19 },
  { id: 'v10', name: 'Wanderlust', icon: 'airplane', color: ['#FF9500', '#4CD964'], tagline: 'Flights & Roadtrips', onlineCount: 10 },
  { id: 'v11', name: 'Pet Lover', icon: 'paw', color: ['#FF2D55', '#FFCC00'], tagline: 'Pups & Parks', onlineCount: 13 },
  { id: 'v12', name: 'Star Gazer', icon: 'telescope', color: ['#5856D6', '#007AFF'], tagline: 'Space & Stars', onlineCount: 16 },
];

export const getVibeByName = (name) => {
  if (!name) return ALL_VIBE_NODES[0];
  return (
    ALL_VIBE_NODES.find(
      (v) => v.name.toLowerCase() === name.toLowerCase() || v.id.toLowerCase() === name.toLowerCase()
    ) || ALL_VIBE_NODES[0]
  );
};
