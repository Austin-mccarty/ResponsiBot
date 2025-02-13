class BaseAnalyzer {
    constructor(doc) {
      if (!doc || (!(doc instanceof Document) && !(doc instanceof Element))) {
        throw new Error("A valid HTML Document or Element must be provided");
      }
      this.doc = doc;
      this.annotations = [];
    }

    addAnnotation(category, issue, location = null, priority = 'medium') {
      this.annotations.push({
        category,
        issue,
        location,
        severity: this.determineSeverity(category, issue, priority),
        suggestion: this.generateSuggestion(category, issue),
        impact: this.calculateImpact(category, priority),
        resources: this.provideResources(category, issue)
      });
    }

    findElementLocation(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
      return {
        xpath: this.getXPath(element),
        tag: element.tagName.toLowerCase(),
        classes: element.className,
        id: element.id,
        attributes: this.getAttributes(element),
        text_preview: element.textContent?.slice(0, 100)
      };
    }

    getXPath(element) {
      if (element.id) return `//*[@id="${element.id}"]`;
      const parts = [];
      while (element && element.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
          if (sibling.tagName === element.tagName) index++;
        }
        parts.unshift(`${element.tagName.toLowerCase()}[${index}]`);
        element = element.parentNode;
      }
      return `/${parts.join('/')}`;
    }

    getAttributes(element) {
      const attributes = {};
      for (const attr of element.attributes) {
        attributes[attr.name] = attr.value;
      }
      return attributes;
    }

    determineSeverity(category, issue, priority) {
      if (priority) return priority;
      switch (category) {
        case 'security': return 'high';
        case 'accessibility':
        case 'performance':
        case 'responsive': return 'medium';
        case 'seo': return 'high';
        default: return 'low';
      }
    }

    generateSuggestion(category, issue) {
      const suggestions = {
        accessibility: [
          { test: /alt text/i, text: "Add descriptive alt text to images. Example: alt='Description'" },
          { test: /aria-label/i, text: "Include aria-labels for context. Example: aria-label='Close'" }
        ],
        seo: [
          { test: /meta description/i, text: "Add a meta description tag with a summary of the page." },
          { test: /title/i, text: "Add a descriptive title tag for the page." }
        ],
        performance: [
          { test: /lazy loading/i, text: "Add loading='lazy' to images to improve performance." },
          { test: /script/i, text: "Use async or defer for non-critical scripts." }
        ],
        responsive: [
          { test: /viewport/i, text: "Include a proper viewport meta tag: <meta name='viewport' content='width=device-width, initial-scale=1'>" }
        ],
        security: [
          { test: /https/i, text: "Ensure all resources use HTTPS." },
          { test: /csrf/i, text: "Implement CSRF tokens for forms." }
        ]
      };

      const rules = suggestions[category];
      if (rules) {
        for (let rule of rules) {
          if (rule.test.test(issue)) {
            return rule.text;
          }
        }
      }
      return "Review and address the identified issue according to web standards.";
    }

    calculateImpact(category, priority) {
      const score = priority === 'high' ? 3 : (priority === 'medium' ? 2 : 1);
      return {
        score,
        areas_affected: this.getImpactAreas(category),
        potential_loss: this.getPotentialImpact(category, priority)
      };
    }

    getImpactAreas(category) {
      const areas = {
        accessibility: ['User Experience', 'Legal Compliance', 'Brand Reputation'],
        performance: ['Page Load Time', 'User Engagement', 'Conversion Rate'],
        seo: ['Search Rankings', 'Organic Traffic', 'Brand Visibility'],
        responsive: ['Mobile Usability', 'User Engagement', 'Conversion Rate'],
        security: ['Data Protection', 'User Trust', 'Legal Compliance']
      };
      return areas[category] || ['General User Experience'];
    }

    getPotentialImpact(category, severity) {
      if (severity === 'high') {
        if (category === 'security') return 'Potential data breach or security vulnerability';
        if (category === 'accessibility') return 'May prevent users from accessing content';
        if (category === 'performance') return 'Significant impact on page load time';
        if (category === 'responsive') return 'Poor mobile experience may reduce engagement';
      }
      return 'Minor impact on user experience';
    }

    provideResources(category, issue) {
      const resources = {
        accessibility: {
          documentation: ['https://www.w3.org/WAI/WCAG21/quickref/', 'https://a11yproject.com/'],
          tools: ['WAVE', 'aXe', 'NVDA'],
          best_practices: ['Use semantic HTML', 'Provide alt text', 'Ensure keyboard navigation']
        },
        seo: {
          documentation: ['https://developers.google.com/search/docs/fundamentals/seo-starter-guide'],
          tools: ['Google Search Console', 'Screaming Frog', 'Ahrefs'],
          best_practices: ['Use descriptive titles', 'Optimize meta descriptions']
        },
        performance: {
          documentation: ['https://web.dev/performance-scoring/', 'https://developers.google.com/web/fundamentals/performance'],
          tools: ['Lighthouse', 'WebPageTest', 'GTmetrix'],
          best_practices: ['Optimize images', 'Minimize render-blocking resources']
        },
        responsive: {
          documentation: ['https://web.dev/responsive-web-design-basics/'],
          tools: ['Chrome DevTools (Device Mode)'],
          best_practices: ['Use media queries', 'Test on multiple devices']
        },
        security: {
          documentation: ['https://owasp.org/Top10/'],
          tools: ['OWASP ZAP', 'Burp Suite'],
          best_practices: ['Use HTTPS', 'Implement proper authentication']
        }
      };
      return resources[category] || {
        documentation: ['https://web.dev/learn'],
        tools: ['Browser DevTools'],
        best_practices: ['Follow web standards']
      };
    }
  }

  class AccessibilityAnalyzer extends BaseAnalyzer {
    analyze() {

      // Check for images missing alt text.
      this.doc.querySelectorAll('img:not([alt])').forEach(img => {
        this.addAnnotation('accessibility', 'Missing alt text on image', this.findElementLocation(img), 'high');
      });

      // Check for buttons without accessible names.
      this.doc.querySelectorAll('button').forEach(button => {
        if (!button.hasAttribute('aria-label') && !button.textContent.trim()) {
          this.addAnnotation('accessibility', 'Button missing accessible name', this.findElementLocation(button), 'high');
        }
      });

      // Check for form controls missing labels.
      this.doc.querySelectorAll('input, select, textarea').forEach(control => {
        const hasAriaLabel = control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby');
        const id = control.getAttribute('id');
        const hasLabel = id ? !!this.doc.querySelector(`label[for="${id}"]`) : false;
        if (!hasAriaLabel && !hasLabel) {
          this.addAnnotation('accessibility', 'Form control missing label', this.findElementLocation(control), 'high');
        }
      });

      // Check for anchors with no discernible text.
      this.doc.querySelectorAll('a').forEach(anchor => {
        if (!anchor.textContent.trim() && !anchor.hasAttribute('aria-label')) {
          this.addAnnotation('accessibility', 'Anchor element missing discernible text', this.findElementLocation(anchor), 'medium');
        }
      });

      return this.annotations;
    }
  }

  class SeoAnalyzer extends BaseAnalyzer {
    analyze() {
      const h1s = this.doc.querySelectorAll('h1');
      if (h1s.length === 0) {
        this.addAnnotation('seo', 'Missing H1 heading', null, 'high');
      } else if (h1s.length > 1) {
        this.addAnnotation('seo', 'Multiple H1 headings found', null, 'medium');
      }
      this.doc.querySelectorAll('img:not([alt])').forEach(img => {
        this.addAnnotation('seo', 'Image missing alt text (affects SEO)', this.findElementLocation(img), 'medium');
      });
      this.doc.querySelectorAll('a').forEach(link => {
        if (!link.textContent.trim() && !link.hasAttribute('aria-label')) {
          this.addAnnotation('seo', 'Empty link text (bad for SEO)', this.findElementLocation(link), 'medium');
        }
      });
      return this.annotations;
    }
  }

  class PerformanceAnalyzer extends BaseAnalyzer {
    analyze() {
      this.doc.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('loading')) {
          this.addAnnotation('performance', 'Image should use lazy loading', this.findElementLocation(img), 'medium');
        }
        if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
          this.addAnnotation('performance', 'Image missing dimensions', this.findElementLocation(img), 'medium');
        }
      });

      this.doc.querySelectorAll('script[src]').forEach(script => {
        if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
          this.addAnnotation('performance', 'Script blocking page render', this.findElementLocation(script), 'high');
        }
      });

      return this.annotations;
    }
  }

  class ResponsiveAnalyzer extends BaseAnalyzer {
    analyze() {

      this.doc.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('srcset') && !img.hasAttribute('sizes')) {
          this.addAnnotation('responsive', 'Image lacks responsive attributes (srcset/sizes)', this.findElementLocation(img), 'medium');
        }
        if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
          this.addAnnotation('responsive', 'Image missing dimensions may cause layout shifts', this.findElementLocation(img), 'medium');
        }
      });

      this.doc.querySelectorAll('table').forEach(table => {
        // Check if the table is wrapped in an element with the class 'table-responsive'
        if (!table.parentElement || !table.parentElement.classList.contains('table-responsive')) {
          this.addAnnotation('responsive', 'Table may not be mobile-friendly', this.findElementLocation(table), 'medium');
        }
      });

      this.doc.querySelectorAll('[style*="font-size"]').forEach(el => {
        const match = el.getAttribute('style').match(/font-size:\s*(\d+)px/);
        if (match && parseInt(match[1], 10) < 16) {
          this.addAnnotation('responsive', 'Font size too small for mobile devices', this.findElementLocation(el), 'medium');
        }
      });

      return this.annotations;
    }
  }

  class SecurityAnalyzer extends BaseAnalyzer {
    analyze() {
      this.doc.querySelectorAll('[src], [href]').forEach(el => {
        const url = el.getAttribute('src') || el.getAttribute('href');
        if (url && url.startsWith('http://')) {
          this.addAnnotation('security', 'Resource loaded over insecure HTTP', this.findElementLocation(el), 'high');
        }
      });

      this.doc.querySelectorAll('[onclick], [onmouseover], [onload]').forEach(el => {
        this.addAnnotation('security', 'Inline event handler detected which may pose security risks', this.findElementLocation(el), 'medium');
      });

      this.doc.querySelectorAll('form').forEach(form => {
        const action = form.getAttribute('action');
        if (action && action.startsWith('http://')) {
          this.addAnnotation('security', 'Form action uses insecure HTTP', this.findElementLocation(form), 'high');
        }
      });

      return this.annotations;
    }
  }

  class WebAnalyzer {
    constructor(html) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        if (doc.body) {
          this.doc = doc.body;
        } else {
          throw new Error("No body tag found in HTML");
        }
      } catch (e) {
        console.error("Invalid HTML provided:", e);
        throw e;
      }
    }

    analyze() {
      const accessibility = new AccessibilityAnalyzer(this.doc);
      const seo = new SeoAnalyzer(this.doc);
      const performance = new PerformanceAnalyzer(this.doc);
      const responsive = new ResponsiveAnalyzer(this.doc);
      const security = new SecurityAnalyzer(this.doc);

      const annotations = [
        ...accessibility.analyze(),
        ...seo.analyze(),
        ...performance.analyze(),
        ...responsive.analyze(),
        ...security.analyze()
      ];

      return {
        annotations,
        meta: { timestamp: new Date().toISOString() },
        summary: this.generateSummary(annotations)
      };
    }

    generateSummary(annotations) {
      return {
        total_issues: annotations.length,
        critical_issues: annotations.filter(a => a.severity === 'high').length,
        by_category: this.groupBy(annotations, 'category'),
        by_severity: this.groupBy(annotations, 'severity')
      };
    }

    groupBy(items, key) {
      return items.reduce((acc, item) => {
        acc[item[key]] = (acc[item[key]] || 0) + 1;
        return acc;
      }, {});
    }
  }

  window.WebAnalyzer = WebAnalyzer;
