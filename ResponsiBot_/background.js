chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'runAudit') {
      handleAudit(request).then(sendResponse);
      return true;
  }
});

async function handleAudit(request) {
  try {
      await chrome.scripting.executeScript({
          target: { tabId: request.tabId },
          files: ['audit.js']
      });

      const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: request.tabId },
          function: (auditType) => {
              const html = document.documentElement.outerHTML;
              const auditor = new WebsiteAudit(html, auditType);
              return auditor.audit();
          },
          args: [request.auditType]
      });

      return result;
  } catch (error) {
      console.error('Audit error:', error);
      throw new Error('Failed to run audit: ' + error.message);
  }
}
