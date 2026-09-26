const fs = require('fs');

const filePath = 'C:/Users/ARCH/Desktop/HeartLinkLandingPage/styles.css';
let css = fs.readFileSync(filePath, 'utf8');

const sIdx = css.indexOf('.encounters-deck {');
const eIdx = css.indexOf('/* ==========================================================================\n   SCREEN 2: MATCHES');

if (sIdx === -1 || eIdx === -1) {
  console.error('Target range not found!');
  process.exit(1);
}

const newCss = `.encounters-deck {
  flex: 1;
  position: relative;
  margin: 6px 14px 104px;
  border-radius: var(--radius-card);
  perspective: 1000px;
}

.encounter-card {
  position: absolute;
  inset: 0;
  border-radius: 26px;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(35, 6, 25, 0.16), 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease, box-shadow 0.35s ease;
  touch-action: none;
  cursor: grab;
  background: #140712;
}

.encounter-card:active {
  cursor: grabbing;
}

.encounter-card.active-card {
  z-index: 5;
  transform: scale(1) translateY(0);
  opacity: 1;
  box-shadow: 0 18px 42px rgba(35, 6, 25, 0.22), 0 2px 10px rgba(0, 0, 0, 0.06);
}

.encounter-card.next-card {
  z-index: 4;
  transform: scale(0.95) translateY(12px);
  opacity: 0.88;
  filter: brightness(0.93);
}

.card-bg-wrap {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.card-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.encounter-card:hover .card-photo {
  transform: scale(1.02);
}

/* Rich Cinematic Vignette Overlay */
.card-gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(20, 5, 17, 0.42) 0%,
    rgba(20, 5, 17, 0.08) 18%,
    rgba(20, 5, 17, 0) 38%,
    rgba(16, 4, 13, 0.45) 64%,
    rgba(10, 2, 8, 0.95) 98%
  );
  pointer-events: none;
  z-index: 2;
}

/* Top Tags on Encounter Card */
.card-top-tags {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  z-index: 10;
}

.tag-liked-you {
  background: linear-gradient(135deg, rgba(250, 42, 107, 0.95), rgba(255, 77, 141, 0.95));
  color: #FFFFFF;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 4px 14px rgba(250, 42, 107, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.5);
  letter-spacing: 0.2px;
}

.tag-match-score {
  background: rgba(20, 6, 16, 0.58);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: #FFFFFF;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.score-spark {
  color: #FBBF24;
  font-size: 0.75rem;
}

.card-menu-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(20, 6, 16, 0.52);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-menu-btn:hover {
  background: var(--hl-pink);
  border-color: var(--hl-pink);
  transform: scale(1.08);
}

/* Stamps */
.swipe-stamp {
  position: absolute;
  top: 60px;
  padding: 5px 16px;
  border: 3.5px solid;
  border-radius: 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 1.5px;
  opacity: 0;
  pointer-events: none;
  z-index: 15;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
}

.stamp-like {
  right: 20px;
  color: #10B981;
  border-color: #10B981;
  background: rgba(16, 185, 129, 0.12);
  transform: rotate(15deg);
}

.stamp-nope {
  left: 20px;
  color: #EF4444;
  border-color: #EF4444;
  background: rgba(239, 68, 68, 0.12);
  transform: rotate(-15deg);
}

/* Bottom Identity Info on Card */
.card-bottom-info {
  position: absolute;
  bottom: 26px;
  left: 16px;
  right: 16px;
  z-index: 10;
  pointer-events: none;
}

.card-name-line {
  display: flex;
  align-items: center;
}

.card-user-name {
  font-size: 1.48rem;
  font-weight: 800;
  color: #FFFFFF;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  letter-spacing: -0.3px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
}

.card-user-name .verified-badge-blue {
  width: 19px;
  height: 19px;
  font-size: 0.65rem;
  border-radius: 50%;
  background: #1D9BF0;
  color: #FFFFFF;
  box-shadow: 0 0 10px rgba(29, 155, 240, 0.6);
}

.card-user-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
}

.meta-location {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #FFC0D3;
}

.meta-dot {
  opacity: 0.5;
}

.meta-profession {
  color: rgba(255, 255, 255, 0.92);
}

.card-chips-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.card-interest-chip {
  font-size: 0.62rem;
  font-weight: 700;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.24);
  padding: 3px 9px;
  border-radius: var(--radius-full);
  letter-spacing: 0.2px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* ==========================================================================
   ELEVATED LUXURY ACTION BUTTONS DOCK (PASS, CUPID, LIKE)
   ========================================================================== */
.encounter-action-bar {
  position: absolute;
  bottom: 74px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 30;
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 7px 16px;
  border-radius: 46px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 14px 34px rgba(45, 8, 30, 0.16), 0 2px 8px rgba(0, 0, 0, 0.04);
}

.action-circle {
  position: relative;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
  transition: all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 1. Pass Button (✕) */
.btn-card-pass {
  width: 50px;
  height: 50px;
  background: linear-gradient(145deg, #FFFFFF, #FFF5F7);
  border: 1.5px solid rgba(255, 59, 105, 0.18);
  color: #FF3B69;
  font-size: 1.35rem;
  box-shadow: 0 6px 16px rgba(255, 59, 105, 0.14);
}

.btn-card-pass:hover {
  transform: scale(1.12);
  color: #E01E4E;
  border-color: #FF3B69;
  box-shadow: 0 8px 22px rgba(255, 59, 105, 0.28);
}

.btn-card-pass:active {
  transform: scale(0.92);
}

/* 2. Centerpiece Cupid / Superlike Button (🏹) */
.btn-card-cupid {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #FF1E75 0%, #FA2A6B 45%, #9333EA 100%);
  border: 3px solid #FFFFFF;
  box-shadow: 0 10px 28px rgba(250, 42, 107, 0.48), 0 0 18px rgba(147, 51, 234, 0.35);
  transform: translateY(-2px);
}

.cupid-pulse-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid rgba(250, 42, 107, 0.45);
  animation: cupidPulseRing 2.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
  pointer-events: none;
}

@keyframes cupidPulseRing {
  0% {
    transform: scale(0.92);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.22);
    opacity: 0;
  }
  100% {
    transform: scale(1.22);
    opacity: 0;
  }
}

.cupid-svg-icon {
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: transform 0.25s ease;
}

.btn-card-cupid:hover {
  transform: scale(1.12) translateY(-4px);
  box-shadow: 0 14px 34px rgba(250, 42, 107, 0.65), 0 0 24px rgba(147, 51, 234, 0.5);
}

.btn-card-cupid:hover .cupid-svg-icon {
  transform: rotate(-10deg) scale(1.08);
}

.btn-card-cupid:active {
  transform: scale(0.93) translateY(0);
}

/* 3. Like Button (♥) */
.btn-card-like {
  width: 50px;
  height: 50px;
  background: linear-gradient(145deg, #FFFFFF, #F0FFF8);
  border: 1.5px solid rgba(16, 185, 129, 0.22);
  color: #10B981;
  font-size: 1.45rem;
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.16);
}

.btn-card-like:hover {
  transform: scale(1.12);
  color: #059669;
  border-color: #10B981;
  box-shadow: 0 8px 22px rgba(16, 185, 129, 0.32);
}

.btn-card-like:active {
  transform: scale(0.92);
}

/* Empty Deck State */
.deck-empty-state {
  position: absolute;
  inset: 0;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  background: var(--hl-bg-cream);
  border-radius: var(--radius-card);
}

.deck-empty-state.show {
  display: flex;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--hl-pink-subtle);
  color: var(--hl-pink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.deck-empty-state h3 {
  font-size: 1.15rem;
  margin-bottom: 6px;
}

.deck-empty-state p {
  font-size: 0.78rem;
  color: var(--hl-text-muted);
  margin-bottom: 16px;
  line-height: 1.4;
}

.btn-reload-encounters {
  padding: 8px 18px;
  background: var(--hl-pink);
  color: #FFFFFF;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(250, 42, 107, 0.35);
}

`;

css = css.substring(0, sIdx) + newCss + css.substring(eIdx);
fs.writeFileSync(filePath, css, 'utf8');
console.log('Successfully updated styles.css encounters styling!');
