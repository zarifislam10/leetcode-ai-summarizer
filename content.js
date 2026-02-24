// ─── Config ────────────────────────────────────────────────────────────────
const BACKEND_URL = 'http://127.0.0.1:5000/summarize';

// ─── Icons ───────────────────────────────────────────────────────────────────
const sunIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun-icon lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
const moonIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon-icon lucide-moon"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>'

// ─── Check cache first, fetch from backend if not cached ─────────────────
function getProblemId() {
  const match = window.location.pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

// ─── Button ─────────────────────────────────────────────────────────────────
function createSummarizeButton() {
  const button = document.createElement('button');
  button.id = 'lc-star-btn';
  button.title = 'AI Summarizer';
  button.innerHTML = '★';
  document.body.appendChild(button);
  button.addEventListener('click', handleSummarizeClick);
}

// ─── Popup ───────────────────────────────────────────────────────────────────
function createSummaryPopup() {
  const popup = document.createElement('div');
  popup.id = 'lc-popup';
  popup.style.display = 'none';
  popup.innerHTML = `
    <div class="lc-popup-inner">
      <div class="lc-popup-header">
        <span class="lc-popup-logo">★ AI Summarizer</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="lc-theme-toggle" id="lc-theme-toggle">${sunIcon}</button>
          <button class="lc-close">✕</button>
        </div>
      </div>

      <div id="lc-loading" style="display:none">
        <div class="lc-spinner"></div>
        <span>Analyzing problem...</span>
      </div>

      <div id="lc-results" style="display:none">

        <div class="lc-card" id="lc-card-summary">
          <div class="lc-card-label">
            <span class="lc-card-icon">📋</span> Summary
          </div>
          <div id="lc-summary-text" class="lc-card-body"></div>
          <button class="lc-copy-btn" data-target="lc-summary-text">Copy</button>
        </div>

        <div class="lc-card" id="lc-card-ds">
          <div class="lc-card-label">
            <span class="lc-card-icon">🧩</span> Data Structure / Algorithm
          </div>
          <div id="lc-ds-badge"></div>
          <div id="lc-ds-reason" class="lc-card-body lc-muted"></div>
        </div>

        <div class="lc-card" id="lc-card-practice">
          <div class="lc-card-label">
            <span class="lc-card-icon">🎯</span> Practice First
          </div>
          <a id="lc-practice-link" href="#" target="_blank" class="lc-practice-title"></a>
          <div id="lc-practice-reason" class="lc-card-body lc-muted"></div>
        </div>

      </div>

      <div id="lc-error" style="display:none" class="lc-error-box"></div>
    </div>
  `;
  document.body.appendChild(popup);

  popup.querySelector('.lc-close').addEventListener('click', () => {
    popup.style.display = 'none';
  });
  
  let isLight = false;
  popup.querySelector('#lc-theme-toggle').addEventListener('click', () => {
    isLight = !isLight;
    popup.classList.toggle('lc-light', isLight);
    popup.querySelector('#lc-theme-toggle').innerHTML = isLight ? moonIcon : sunIcon;
  });

  popup.querySelectorAll('.lc-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const text = document.getElementById(targetId).textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied ✓';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

// ─── Extract Problem Text ────────────────────────────────────────────────────
function extractProblemText() {
  const problemDiv =
    document.querySelector('[data-track-load="description_content"]') ||
    document.querySelector('.description__24sA') ||
    document.querySelector('.content__u3I1') ||
    document.querySelector('.description');

  if (!problemDiv) return null;

  const tempDiv = problemDiv.cloneNode(true);
  tempDiv.querySelectorAll('pre, .example').forEach(el => el.remove());
  return tempDiv.textContent.trim().replace(/\s+/g, ' ');
}

// ─── Call Flask Backend ──────────────────────────────────────────────────────
async function fetchSummary(problemText) {
  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem_text: problemText })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Server error');
  }

  return response.json();
}

// ─── Render Results ──────────────────────────────────────────────────────────
function showResults(data) {
  document.getElementById('lc-loading').style.display = 'none';
  document.getElementById('lc-error').style.display = 'none';
  document.getElementById('lc-results').style.display = 'flex';

  document.getElementById('lc-summary-text').textContent = data.summary || 'N/A';

  const dsBadge = document.getElementById('lc-ds-badge');
  dsBadge.textContent = data.data_structure || 'N/A';

  document.getElementById('lc-ds-reason').textContent = data.data_structure_reason || '';

  const practice = data.practice_first;
  if (practice) {
    const link = document.getElementById('lc-practice-link');
    link.textContent = `#${practice.number} – ${practice.title}`;
    link.href = `https://leetcode.com/problems/${practice.slug}/`;
    document.getElementById('lc-practice-reason').textContent = practice.reason || '';
  } else {
    document.getElementById('lc-card-practice').style.display = 'none';
  }

  // Animate cards in
  document.querySelectorAll('.lc-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 0.1}s`;
    card.classList.add('lc-card-animate');
  });
}

function showError(message) {
  document.getElementById('lc-loading').style.display = 'none';
  document.getElementById('lc-results').style.display = 'none';
  const errorBox = document.getElementById('lc-error');
  errorBox.style.display = 'block';
  errorBox.textContent = `⚠️ ${message}`;
}

// ─── Main Click Handler ──────────────────────────────────────────────────────
async function handleSummarizeClick() {
  const popup = document.getElementById('lc-popup');
  popup.style.display = 'block';

  document.getElementById('lc-loading').style.display = 'flex';
  document.getElementById('lc-results').style.display = 'none';
  document.getElementById('lc-error').style.display = 'none';

  // Reset cards
  document.querySelectorAll('.lc-card').forEach(c => {
    c.style.display = '';
    c.classList.remove('lc-card-animate');
  });

  try {
    const problemText = extractProblemText();
    if (!problemText) throw new Error('Could not find problem description on this page.');
    
    const problemId = getProblemId();
    const cacheKey = `lc_cache_${problemId}`;

    // Check cache first
    const cached = await chrome.storage.local.get(cacheKey);
    if (cached[cacheKey]) {
      showResults(cached[cacheKey]);
      return;
    }
    
    // Not cahched - fetch from backend
    const data = await fetchSummary(problemText);

    // Save to cache
    if (problemId) {
      await chrome.storage.local.set({ [cacheKey]: data });
    }

    // Show results
    showResults(data);
  } catch (err) {
    showError(err.message);
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
function init() {
  createSummarizeButton();
  createSummaryPopup();

  // Auto-close popup on navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.getElementById('lc-popup').style.display = 'none';
    }
  }).observe(document, { subtree: true, childList: true});
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
