class PopupController {
    constructor() {
      this.elements = {
        analyzeButton: document.getElementById('analyze'),
        summaryDiv: document.getElementById('summary'),
        screenshotContainer: document.getElementById('screenshot-container'),
        issuesContainer: document.getElementById('issues-container'),
        categoryFilter: document.getElementById('category-filter'),
        severityFilter: document.getElementById('severity-filter')
      };
      this.analysisResult = null;
      this.bindEvents();
    }

    bindEvents() {
      this.elements.analyzeButton.addEventListener('click', this.handleAnalyze.bind(this));
      this.elements.categoryFilter.addEventListener('change', this.applyFilters.bind(this));
      this.elements.severityFilter.addEventListener('change', this.applyFilters.bind(this));
    }

    updateButtonState(isAnalyzing) {
      this.elements.analyzeButton.disabled = isAnalyzing;
      this.elements.analyzeButton.textContent = isAnalyzing ? 'Analyzing...' : 'Analyze Page';
      this.elements.analyzeButton.classList.toggle('analyzing', isAnalyzing);
    }

    handleAnalyze() {
      this.updateButtonState(true);
      chrome.runtime.sendMessage({ action: 'analyze' }, (response) => {
        if (chrome.runtime.lastError) {
          this.showError(chrome.runtime.lastError);
        } else {
          this.analysisResult = response.annotations;
          this.renderSummary(this.analysisResult.meta, this.analysisResult.summary);
          this.renderScreenshot(response.screenshots.desktop);
          this.renderIssues(this.analysisResult.annotations);
        }
        this.updateButtonState(false);
      });
    }

    applyFilters() {
      if (!this.analysisResult) return;
      const filters = {
        category: this.elements.categoryFilter.value,
        severity: this.elements.severityFilter.value
      };

      const filtered = this.analysisResult.annotations.filter((issue) =>
        (filters.category === 'all' || issue.category === filters.category) &&
        (filters.severity === 'all' || issue.severity === filters.severity)
      );
      this.renderIssues(filtered);
    }

    renderSummary(meta, summary) {
      this.elements.summaryDiv.innerHTML = `
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total Issues</span>
            <span class="summary-value">${summary.total_issues}</span>
          </div>
          <div class="summary-item ${summary.critical_issues > 0 ? 'critical' : ''}">
            <span class="summary-label">Critical Issues</span>
            <span class="summary-value">${summary.critical_issues}</span>
          </div>
        </div>
      `;
    }

    renderScreenshot(dataUrl) {
      this.elements.screenshotContainer.innerHTML = `
        <div class="screenshot-wrapper">
          <img src="${dataUrl}" alt="Full-page Screenshot" loading="lazy" />
        </div>
      `;
    }

    renderIssues(issues) {
      if (!issues?.length) {
        this.elements.issuesContainer.innerHTML = `
          <div class="no-issues">
            <span class="no-issues-icon">📋</span>
            <p>No issues match the selected filters.</p>
          </div>
        `;
        return;
      }

      this.elements.issuesContainer.innerHTML = issues.map((issue, index) => `
        <div class="issue ${issue.severity}" data-index="${index}">
          <div class="issue-header">
            <div class="issue-title">
              <span class="severity-indicator"></span>
              <h3>${issue.issue}</h3>
            </div>
            <span class="toggle-indicator">▼</span>
          </div>
          <div class="issue-body">
            <div class="issue-details">
              <div class="detail-item">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${issue.category}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Severity:</span>
                <span class="detail-value ${issue.severity}">${issue.severity}</span>
              </div>
            </div>
            ${issue.location ? `
            <div class="location-details">
              <div class="detail-item">
                <span class="detail-label">Element:</span>
                <span class="detail-value">
                  ${issue.location.tag}${issue.location.id ? '#' + issue.location.id : ''}${issue.location.classes ? '.' + issue.location.classes.split(/\s+/).join('.') : ''}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">XPath:</span>
                <span class="detail-value xpath">${issue.location.xpath}</span>
              </div>
              <div class="detail-item code-preview">
                <code>${issue.location.text_preview || 'No preview available'}</code>
              </div>
            </div>` : `
            <div class="location-details">
              <div class="detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">Not available</span>
              </div>
            </div>`}
            <div class="suggestion">
              <p>${issue.suggestion}</p>
            </div>
            <div class="resources">
              <h4>Resources</h4>
              <div class="resource-links">
                ${issue.resources.documentation.map(link => `
                  <a href="${link}" target="_blank" class="resource-link">
                    <span class="link-icon">📚</span>
                    <span class="link-text">${new URL(link).hostname}</span>
                  </a>
                `).join('')}
              </div>
              <div class="resource-group">
                <h5>Tools</h5>
                <p>${issue.resources.tools.join(', ')}</p>
              </div>
              <div class="resource-group">
                <h5>Best Practices</h5>
                <p>${issue.resources.best_practices.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      // Set up accordion toggles and XPath copy functionality.
      document.querySelectorAll('.issue-header').forEach(header => {
        header.addEventListener('click', () => {
          const issueEl = header.parentElement;
          const body = issueEl.querySelector('.issue-body');
          const indicator = header.querySelector('.toggle-indicator');
          const isExpanding = body.style.display !== 'block';
          body.style.display = 'block';
          body.style.maxHeight = isExpanding ? `${body.scrollHeight}px` : '0';
          issueEl.classList.toggle('expanded', isExpanding);
          indicator.style.transform = `rotate(${isExpanding ? '180deg' : '0deg'})`;
          if (!isExpanding) {
            setTimeout(() => {
              body.style.display = 'none';
            }, 300);
          }
        });
      });

      document.querySelectorAll('.xpath').forEach(element => {
        element.style.cursor = 'pointer';
        element.title = 'Click to copy XPath';
        element.addEventListener('click', () => {
          const xpathText = element.textContent.trim();
          navigator.clipboard.writeText(xpathText)
            .then(() => {
              const originalText = xpathText;
              element.textContent = 'Copied!';
              setTimeout(() => {
                element.textContent = originalText;
              }, 2000);
            })
            .catch(err => console.error('Error copying XPath:', err));
        });
      });
    }

    showError(error) {
      this.elements.summaryDiv.innerHTML = `
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          <p>${error.message || 'An error occurred'}</p>
        </div>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
