# ResponsiBot Chrome Extension

A Chrome extension for Sokal website auditing.

## Features
- Website setup validation
- More features coming soon

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Austin-mccarty/responsibot.git
cd responsibot
```

2. Create development branch:
```bash
git checkout -b your-feature-name
```

3. Load in Chrome:
- Go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the project directory

## Development Workflow

### Making Changes
1. Update necessary files
2. Test in Chrome:
   - Refresh extension
   - Test on sample pages
3. Commit changes:
```bash
git add .
git commit -m "description of changes"
git push origin your-feature-name
```

### Pull Requests
1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your feature branch
4. Add description and request review

### Project Structure
```
responsibot/
├── audit.js         # Core audit logic
├── background.js    # Background worker
├── manifest.json    # Extension config
├── popup.html      # Extension UI
├── popup.css       # Styling
└── popup.js        # UI controller
```

### Reload Extension
After making changes:
1. Go to `chrome://extensions/`
2. Find ResponsiBot
3. Click the refresh icon
4. Reload test page

## Contributing
1. Fork repository
2. Create feature branch
3. Make changes
4. Submit pull request
