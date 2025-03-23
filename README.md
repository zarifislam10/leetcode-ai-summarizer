# LeetCode AI Problem Summarizer

A Chrome Extension that uses OpenAI's GPT to provide concise summaries and solution approaches for LeetCode problems.

## Features

- 🌟 One-click problem summarization
- 💡 Suggests relevant data structures and algorithms
- 🎨 Interactive UI with collapsible summaries
- ✨ Animated star-shaped button
- 📋 Copy summary functionality
- 🔄 Loading animations and smooth transitions

## Demo
[Add a GIF or screenshot of your extension in action]

## Installation

1. Clone this repository
```bash
git clone https://github.com/zarifislam10/leetcode-ai-summarizer.git
```

2. Create a config.js file with your OpenAI API key:
```javascript
const OPENAI_API_KEY = 'your-api-key-here';
```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## Usage

1. Visit any LeetCode problem page
2. Click the star-shaped "Summarize Problem" button
3. View the concise problem summary and suggested approach
4. Toggle the summary view using the collapse/expand button
5. Copy the summary with one click

## Tech Stack

- JavaScript
- HTML/CSS
- Chrome Extensions API
- OpenAI GPT-3.5 API

## Configuration

The extension requires an OpenAI API key to function. Get yours at [OpenAI Platform](https://platform.openai.com/).

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
