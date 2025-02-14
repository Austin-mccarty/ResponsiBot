class PopupController {
  constructor() {
      this.auditType = document.getElementById('audit-type');
      this.startButton = document.getElementById('start-audit');
      this.resultsContainer = document.getElementById('results');
      this.summarySection = document.getElementById('summary');
      this.issuesSection = document.getElementById('issues');

      this.bindEvents();
  }

  bindEvents() {
      this.startButton.addEventListener('click', () => this.startAudit());
  }

  async startAudit() {
      this.startButton.disabled = true;
      this.startButton.textContent = 'Auditing...';
      this.resultsContainer.style.display = 'none';

      try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

          const results = await chrome.runtime.sendMessage({
              action: 'runAudit',
              tabId: tab.id,
              auditType: this.auditType.value
          });

          this.displayResults(results);
      } catch (error) {
          this.displayError(error);
      } finally {
          this.startButton.disabled = false;
          this.startButton.textContent = 'Start Audit';
      }
  }

  displayResults(results) {
      this.resultsContainer.style.display = 'flex';

      this.summarySection.innerHTML = `
          <h2>Summary</h2>
          <p>Total Issues: ${results.modules.setup.summary.total}</p>
          <p>Critical Issues: ${results.modules.setup.summary.critical}</p>
      `;

      this.issuesSection.innerHTML = results.modules.setup.issues
          .map(issue => this.createIssueCard(issue))
          .join('');
  }

  createIssueCard(issue) {
      return `
          <div class="issue-card ${issue.severity}">
              <div class="issue-header">
                  <span class="issue-title">${issue.description}</span>
                  <span class="issue-severity ${issue.severity}">${issue.severity}</span>
              </div>
              <div class="issue-category">Category: ${issue.category}</div>
              ${issue.location ? `
                  <div class="issue-location">
                      <div>Element: ${issue.location.tag}${issue.location.id ? `#${issue.location.id}` : ''}</div>
                      <div>XPath: ${issue.location.xpath}</div>
                  </div>
              ` : ''}
          </div>
      `;
  }

  displayError(error) {
      this.resultsContainer.style.display = 'flex';
      this.resultsContainer.innerHTML = `
          <div class="error-message">
              <p>Error: ${error.message}</p>
          </div>
      `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});