const loadImage = async (dataUrl) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return createImageBitmap(blob);
  };

  const toggleNavigation = async (tabId, hide = true) => {
    await chrome.scripting.executeScript({
      target: { tabId },
      function: (shouldHide) => {
        const navSelectors = [
          'nav',
          '[role="navigation"]',
          'header',
          '.navbar',
          '.nav-bar',
          '.navigation',
          '#navigation',
          '.header'
        ];

        navSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.style.setProperty('display', shouldHide ? 'none' : '', 'important');
          });
        });
      },
      args: [hide]
    });

    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const captureFullPage = async (tab) => {
    await toggleNavigation(tab.id, true);

    const [{ result: info }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => ({
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight
      })
    });

    const { pageWidth, pageHeight, viewportHeight } = info;
    const shots = [];
    const numShots = Math.ceil(pageHeight / viewportHeight);

    try {
      for (let i = 0; i < numShots; i++) {
        const scrollY = i * viewportHeight;

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: (y) => {
            window.scrollTo(0, y);
            return new Promise(resolve => setTimeout(resolve, 300));
          },
          args: [scrollY]
        });

        const screenshotData = await new Promise((resolve) => {
          chrome.tabs.captureVisibleTab(null, { format: "png" }, resolve);
        });
        shots.push({ y: scrollY, dataUrl: screenshotData });
      }

      const canvas = new OffscreenCanvas(pageWidth, pageHeight);
      const ctx = canvas.getContext("2d");

      for (let shot of shots) {
        const imgBitmap = await loadImage(shot.dataUrl);
        ctx.drawImage(imgBitmap, 0, shot.y, pageWidth, viewportHeight);
      }
      const blob = await canvas.convertToBlob();
      const finalDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      return finalDataUrl;
    } finally {
      await toggleNavigation(tab.id, false);
    }
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyze") {
      chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
        const tab = tabs[0];
        const screenshotUrl = await captureFullPage(tab);

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['analyzers.js']
        });

        const [{ result: analysis }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            const html = document.documentElement.outerHTML;
            const analyzer = new WebAnalyzer(html);
            return analyzer.analyze();
          }
        });

        sendResponse({
          screenshots: { desktop: screenshotUrl },
          annotations: analysis
        });
      });
      return true;
    }
  });