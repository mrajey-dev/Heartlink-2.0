const fs = require('fs');

const filePath = 'C:/Users/ARCH/Desktop/HeartLinkLandingPage/index.html';
let html = fs.readFileSync(filePath, 'utf8');

const oldCardsStart = html.indexOf('<!-- Card 1: Priyanka, 24 -->');
const oldActionsEnd = html.indexOf('</section>\n\n            <!-- ========================================================== -->\n            <!-- SCREEN 2: MATCHES');

if (oldCardsStart === -1 || oldActionsEnd === -1) {
  console.error('Target not found! oldCardsStart:', oldCardsStart, 'oldActionsEnd:', oldActionsEnd);
  process.exit(1);
}

const newDeckAndActions = `<!-- Card 1: Priyanka, 24 -->
              <div class="encounter-card active-card" id="card-priyanka" data-name="Priyanka" data-age="24">
                <div class="card-bg-wrap">
                  <img src="assets/priyanka.jpg" alt="Priyanka" class="card-photo">
                  <div class="card-gradient-overlay"></div>
                </div>

                <!-- Card Header Overlay -->
                <div class="card-top-tags">
                  <div class="tag-liked-you">
                    <i class="fa-solid fa-heart"></i> Liked you
                  </div>
                  <div class="tag-match-score">
                    <span class="score-spark">✨</span> 96% Match
                  </div>
                  <button class="card-menu-btn" title="View Profile Details">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                </div>

                <!-- Stamps -->
                <div class="swipe-stamp stamp-like">LIKE</div>
                <div class="swipe-stamp stamp-nope">NOPE</div>

                <!-- Bottom Identity Info -->
                <div class="card-bottom-info">
                  <div class="card-name-line">
                    <h3 class="card-user-name">Priyanka, 24 <span class="verified-badge-blue"><i class="fa-solid fa-check"></i></span></h3>
                  </div>
                  <div class="card-user-meta">
                    <span class="meta-location"><i class="fa-solid fa-location-dot"></i> Nashik • 2.5 km</span>
                    <span class="meta-dot">•</span>
                    <span class="meta-profession">Ceramicist & Artist</span>
                  </div>
                  <div class="card-chips-row">
                    <span class="card-interest-chip">🎸 Indie Music</span>
                    <span class="card-interest-chip">☕ Espresso</span>
                    <span class="card-interest-chip">🌿 Pottery</span>
                  </div>
                </div>
              </div>

              <!-- Card 2: Swati (sweetie, 26) -->
              <div class="encounter-card next-card" id="card-swati" data-name="Swati" data-age="26">
                <div class="card-bg-wrap">
                  <img src="assets/swati.jpg" alt="Swati" class="card-photo">
                  <div class="card-gradient-overlay"></div>
                </div>
                <div class="card-top-tags">
                  <div class="tag-liked-you">
                    <i class="fa-solid fa-heart"></i> Liked you
                  </div>
                  <div class="tag-match-score">
                    <span class="score-spark">✨</span> 98% Match
                  </div>
                  <button class="card-menu-btn" title="View Profile Details">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                </div>
                <div class="swipe-stamp stamp-like">LIKE</div>
                <div class="swipe-stamp stamp-nope">NOPE</div>
                <div class="card-bottom-info">
                  <div class="card-name-line">
                    <h3 class="card-user-name">sweetie, 26 <span class="verified-badge-blue"><i class="fa-solid fa-check"></i></span></h3>
                  </div>
                  <div class="card-user-meta">
                    <span class="meta-location"><i class="fa-solid fa-location-dot"></i> Nashik • 3.8 km</span>
                    <span class="meta-dot">•</span>
                    <span class="meta-profession">Brand & Visual Lead</span>
                  </div>
                  <div class="card-chips-row">
                    <span class="card-interest-chip">🎨 Digital Art</span>
                    <span class="card-interest-chip">☕ Cozy Cafes</span>
                    <span class="card-interest-chip">🐱 Cats</span>
                  </div>
                </div>
              </div>

              <!-- Card 3: Tara, 23 -->
              <div class="encounter-card" id="card-tara" data-name="Tara" data-age="23" style="display:none;">
                <div class="card-bg-wrap">
                  <img src="assets/profile_female_2.jpg" alt="Tara" class="card-photo">
                  <div class="card-gradient-overlay"></div>
                </div>
                <div class="card-top-tags">
                  <div class="tag-liked-you">
                    <i class="fa-solid fa-heart"></i> Liked you
                  </div>
                  <div class="tag-match-score">
                    <span class="score-spark">✨</span> 94% Match
                  </div>
                  <button class="card-menu-btn" title="View Profile Details">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                </div>
                <div class="swipe-stamp stamp-like">LIKE</div>
                <div class="swipe-stamp stamp-nope">NOPE</div>
                <div class="card-bottom-info">
                  <div class="card-name-line">
                    <h3 class="card-user-name">Tara, 23 <span class="verified-badge-blue"><i class="fa-solid fa-check"></i></span></h3>
                  </div>
                  <div class="card-user-meta">
                    <span class="meta-location"><i class="fa-solid fa-location-dot"></i> Nashik • 1.9 km</span>
                    <span class="meta-dot">•</span>
                    <span class="meta-profession">Landscape Architect</span>
                  </div>
                  <div class="card-chips-row">
                    <span class="card-interest-chip">🏛️ Architecture</span>
                    <span class="card-interest-chip">🍷 Red Wine</span>
                    <span class="card-interest-chip">✈️ Solo Travel</span>
                  </div>
                </div>
              </div>

              <!-- Card 4: Rhea, 24 -->
              <div class="encounter-card" id="card-rhea" data-name="Rhea" data-age="24" style="display:none;">
                <div class="card-bg-wrap">
                  <img src="assets/rhea.jpg" alt="Rhea" class="card-photo">
                  <div class="card-gradient-overlay"></div>
                </div>
                <div class="card-top-tags">
                  <div class="tag-liked-you">
                    <i class="fa-solid fa-heart"></i> Liked you
                  </div>
                  <div class="tag-match-score">
                    <span class="score-spark">✨</span> 91% Match
                  </div>
                  <button class="card-menu-btn" title="View Profile Details">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                </div>
                <div class="swipe-stamp stamp-like">LIKE</div>
                <div class="swipe-stamp stamp-nope">NOPE</div>
                <div class="card-bottom-info">
                  <div class="card-name-line">
                    <h3 class="card-user-name">Rhea, 24 <span class="verified-badge-blue"><i class="fa-solid fa-check"></i></span></h3>
                  </div>
                  <div class="card-user-meta">
                    <span class="meta-location"><i class="fa-solid fa-location-dot"></i> Nashik • 4.1 km</span>
                    <span class="meta-dot">•</span>
                    <span class="meta-profession">Fashion & Styling</span>
                  </div>
                  <div class="card-chips-row">
                    <span class="card-interest-chip">👗 Styling</span>
                    <span class="card-interest-chip">🍣 Sushi</span>
                    <span class="card-interest-chip">🎧 Deep House</span>
                  </div>
                </div>
              </div>

              <!-- Card 5: Ishita, 23 -->
              <div class="encounter-card" id="card-ishita" data-name="Ishita" data-age="23" style="display:none;">
                <div class="card-bg-wrap">
                  <img src="assets/ishita.jpg" alt="Ishita" class="card-photo">
                  <div class="card-gradient-overlay"></div>
                </div>
                <div class="card-top-tags">
                  <div class="tag-liked-you">
                    <i class="fa-solid fa-heart"></i> Liked you
                  </div>
                  <div class="tag-match-score">
                    <span class="score-spark">✨</span> 93% Match
                  </div>
                  <button class="card-menu-btn" title="View Profile Details">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                </div>
                <div class="swipe-stamp stamp-like">LIKE</div>
                <div class="swipe-stamp stamp-nope">NOPE</div>
                <div class="card-bottom-info">
                  <div class="card-name-line">
                    <h3 class="card-user-name">Ishita, 23 <span class="verified-badge-blue"><i class="fa-solid fa-check"></i></span></h3>
                  </div>
                  <div class="card-user-meta">
                    <span class="meta-location"><i class="fa-solid fa-location-dot"></i> Nashik • 5.0 km</span>
                    <span class="meta-dot">•</span>
                    <span class="meta-profession">Full Stack Dev</span>
                  </div>
                  <div class="card-chips-row">
                    <span class="card-interest-chip">💻 Tech</span>
                    <span class="card-interest-chip">🎮 Gaming</span>
                    <span class="card-interest-chip">🍕 Pizza Nights</span>
                  </div>
                </div>
              </div>

              <!-- Card 6: Ananya, 25 -->
              <div class="encounter-card" id="card-ananya" data-name="Ananya" data-age="25" style="display:none;">
                <div class="card-bg-wrap">
                  <img src="assets/profile_female.jpg" alt="Ananya" class="card-photo">
                  <div class="card-gradient-overlay"></div>
                </div>
                <div class="card-top-tags">
                  <div class="tag-liked-you">
                    <i class="fa-solid fa-heart"></i> Liked you
                  </div>
                  <div class="tag-match-score">
                    <span class="score-spark">✨</span> 95% Match
                  </div>
                  <button class="card-menu-btn" title="View Profile Details">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                </div>
                <div class="swipe-stamp stamp-like">LIKE</div>
                <div class="swipe-stamp stamp-nope">NOPE</div>
                <div class="card-bottom-info">
                  <div class="card-name-line">
                    <h3 class="card-user-name">Ananya, 25 <span class="verified-badge-blue"><i class="fa-solid fa-check"></i></span></h3>
                  </div>
                  <div class="card-user-meta">
                    <span class="meta-location"><i class="fa-solid fa-location-dot"></i> Nashik • 2.1 km</span>
                    <span class="meta-dot">•</span>
                    <span class="meta-profession">Wellness Instructor</span>
                  </div>
                  <div class="card-chips-row">
                    <span class="card-interest-chip">🧘‍♀️ Yoga</span>
                    <span class="card-interest-chip">🍵 Matcha</span>
                    <span class="card-interest-chip">🌅 Sunrises</span>
                  </div>
                </div>
              </div>

              <!-- Card 7: Aarav, 26 -->
              <div class="encounter-card" id="card-aarav" data-name="Aarav" data-age="26" style="display:none;">
                <div class="card-bg-wrap">
                  <img src="assets/profile_male.jpg" alt="Aarav" class="card-photo">
                  <div class="card-gradient-overlay"></div>
                </div>
                <div class="card-top-tags">
                  <div class="tag-liked-you">
                    <i class="fa-solid fa-heart"></i> Liked you
                  </div>
                  <div class="tag-match-score">
                    <span class="score-spark">✨</span> 89% Match
                  </div>
                  <button class="card-menu-btn" title="View Profile Details">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                </div>
                <div class="swipe-stamp stamp-like">LIKE</div>
                <div class="swipe-stamp stamp-nope">NOPE</div>
                <div class="card-bottom-info">
                  <div class="card-name-line">
                    <h3 class="card-user-name">Aarav, 26 <span class="verified-badge-blue"><i class="fa-solid fa-check"></i></span></h3>
                  </div>
                  <div class="card-user-meta">
                    <span class="meta-location"><i class="fa-solid fa-location-dot"></i> Nashik • 3.2 km</span>
                    <span class="meta-dot">•</span>
                    <span class="meta-profession">Sound Producer</span>
                  </div>
                  <div class="card-chips-row">
                    <span class="card-interest-chip">🎹 Synth</span>
                    <span class="card-interest-chip">🏍️ Bikes</span>
                    <span class="card-interest-chip">📚 Books</span>
                  </div>
                </div>
              </div>

              <!-- Empty Deck State -->
              <div class="deck-empty-state" id="deck-empty-state">
                <div class="empty-icon-wrap">
                  <i class="fa-solid fa-sparkles"></i>
                </div>
                <h3>All Caught Up!</h3>
                <p>You've seen all top encounters nearby. Check back soon for new sparks.</p>
                <div class="deck-empty-actions">
                  <button class="btn-reload-encounters" id="btn-reload-cards">
                    <i class="fa-solid fa-rotate-left"></i> Reload Encounters
                  </button>
                  <a href="https://play.google.com/store/apps/details?id=com.heartlinkdatingapp.app&pcampaignid=web_share" target="_blank" rel="noopener noreferrer" class="btn-deck-playstore">
                    <i class="fa-brands fa-google-play"></i> Get Full App on Google Play
                  </a>
                </div>
              </div>

            </div>

            <!-- Elevated Luxury Action Buttons Bar -->
            <div class="encounter-action-bar">
              <!-- Pass Button (Left) -->
              <button class="action-circle btn-card-pass" id="btn-enc-pass" title="Pass (Swipe Left)">
                <i class="fa-solid fa-xmark"></i>
              </button>

              <!-- Crush Cupid Button (Center Hero Highlight) -->
              <button class="action-circle btn-card-cupid" id="btn-enc-cupid" title="Crush Match / Superlike">
                <div class="cupid-pulse-ring"></div>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" class="cupid-svg-icon">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#FFFFFF"/>
                  <path d="M4 19.5L19.5 4M19.5 4H14.5M19.5 4V9" stroke="#FFE600" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>

              <!-- Like Button (Right) -->
              <button class="action-circle btn-card-like" id="btn-enc-like" title="Like (Swipe Right)">
                <i class="fa-solid fa-heart"></i>
              </button>
            </div>
`;

html = html.substring(0, oldCardsStart) + newDeckAndActions + html.substring(oldActionsEnd);
fs.writeFileSync(filePath, html, 'utf8');
console.log('Successfully updated index.html cards & action bar!');
