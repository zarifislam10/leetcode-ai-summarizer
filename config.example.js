// OpenAI API configuration
const OPENAI_API_KEY = 'your-api-key-here'; 

// Create and inject the floating button
function createSummarizeButton() {
  const button = document.createElement('button');
  button.id = 'leetcode-summarize-btn';
  button.title = 'Summarize Problem'; // This will show on hover
  button.innerHTML = ''; // The star will be added by CSS
  document.body.appendChild(button);
  
  button.addEventListener('click', handleSummarizeClick);
}

// Create and inject the summary popup
function createSummaryPopup() {
  const popup = document.createElement('div');
  popup.id = 'leetcode-summary-popup';
  popup.style.display = 'none';
  popup.innerHTML = `
    <div class="popup-content">
      <span class="close-btn">&times;</span>
      <div id="summary-content">
        <div id="loading-spinner" style="display: none;">
          <div class="spinner"></div>
          <div style="text-align: center; color: #666;">Analyzing problem...</div>
        </div>
        <div class="summary-container">
          <div class="summary-header">
            <span class="summary-title">Quick Summary</span>
            <button class="toggle-btn">▼</button>
          </div>
          <div id="summary-text" class="expanded"></div>
        </div>
      </div>
      <button id="copy-summary">
        <span class="copy-text">Copy Summary</span>
        <span class="copied-text" style="display: none">Copied! ✓</span>
      </button>
    </div>
  `;
  document.body.appendChild(popup);
  
  // Add event listeners
  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.style.display = 'none';
  });
  
  popup.querySelector('#copy-summary').addEventListener('click', () => {
    const summaryText = popup.querySelector('#summary-text').textContent;
    const copyBtn = popup.querySelector('#copy-summary');
    const copyText = copyBtn.querySelector('.copy-text');
    const copiedText = copyBtn.querySelector('.copied-text');
    
    navigator.clipboard.writeText(summaryText);
    
    copyText.style.display = 'none';
    copiedText.style.display = 'inline';
    copyBtn.style.background = '#4CAF50';
    copyBtn.style.borderColor = '#4CAF50';
    
    setTimeout(() => {
      copyText.style.display = 'inline';
      copiedText.style.display = 'none';
      copyBtn.style.background = '';
      copyBtn.style.borderColor = '#1a90ff';
    }, 2000);
  });

  // Add toggle functionality
  const toggleBtn = popup.querySelector('.toggle-btn');
  const summaryText = popup.querySelector('#summary-text');
  toggleBtn.addEventListener('click', () => {
    summaryText.classList.toggle('expanded');
    summaryText.classList.toggle('collapsed');
    toggleBtn.textContent = summaryText.classList.contains('expanded') ? '▼' : '▶';
  });
}

// Extract problem description from the page
function extractProblemText() {
  // Try different possible selectors that LeetCode might use
  const problemDiv = document.querySelector('[data-track-load="description_content"]') || 
                    document.querySelector('.description__24sA') ||
                    document.querySelector('.content__u3I1') ||
                    document.querySelector('.description');
                    
  if (!problemDiv) return null;
  
  // Clone the div to avoid modifying the original
  const tempDiv = problemDiv.cloneNode(true);
  
  // Remove any code blocks or examples
  const codeBlocks = tempDiv.querySelectorAll('pre, .example');
  codeBlocks.forEach(block => block.remove());
  
  // Get clean text content
  const problemText = tempDiv.textContent.trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' '); // Replace newlines with space
    
  return problemText;
}

// Make the API call to GPT-4
async function summarizeWithGPT(problemText) {
  const prompt = `Summarize this LeetCode problem in 1-2 simple sentences. Then suggest which algorithm or data structure might be used to solve it: ${problemText}`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 100,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Full error:', error); // This will show in the browser's console
    throw new Error('Failed to get summary: ' + error.message);
  }
}

// Handle button click
async function handleSummarizeClick() {
  const popup = document.getElementById('leetcode-summary-popup');
  const loadingSpinner = document.getElementById('loading-spinner');
  const summaryText = document.getElementById('summary-text');
  
  popup.style.display = 'block';
  loadingSpinner.style.display = 'block';
  summaryText.textContent = '';
  
  try {
    const problemText = extractProblemText();
    if (!problemText) {
      throw new Error('Could not find problem description');
    }
    
    const summary = await summarizeWithGPT(problemText);
    summaryText.style.opacity = '0';
    summaryText.textContent = summary;
    summaryText.classList.add('expanded');
    summaryText.classList.remove('collapsed');
    popup.querySelector('.toggle-btn').textContent = '▼';
    // Trigger a fade-in animation
    setTimeout(() => {
      summaryText.style.transition = 'opacity 0.5s ease';
      summaryText.style.opacity = '1';
    }, 50);
  } catch (error) {
    summaryText.textContent = `Error: ${error.message}`;
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Initialize the extension
function init() {
  createSummarizeButton();
  createSummaryPopup();
}

// Run initialization when the page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
