class BaseAudit {
  constructor(doc) {
      if (!doc || (!(doc instanceof Document) && !(doc instanceof Element))) {
          throw new Error("A valid HTML Document or Element must be provided");
      }
      this.doc = doc;
      this.annotations = [];
  }

  addIssue(category, description, severity = "medium", location = null) {
      this.annotations.push({
          category,
          description,
          severity,
          location: location ? this.getElementLocation(location) : null,
          timestamp: new Date().toISOString()
      });
  }

  getElementLocation(element) {
      if (!element) return null;
      return {
          xpath: this.getXPath(element),
          tag: element.tagName.toLowerCase(),
          classes: element.className,
          id: element.id,
          preview: element.textContent?.slice(0, 100)
      };
  }

  getXPath(element) {
      if (element.id) return `//*[@id="${element.id}"]`;
      const parts = [];
      while (element && element.nodeType === 1) {
          let index = 1;
          for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
              if (sibling.tagName === element.tagName) index++;
          }
          parts.unshift(`${element.tagName.toLowerCase()}[${index}]`);
          element = element.parentNode;
      }
      return `/${parts.join("/")}`;
  }
}

// Website Setup Module
class WebsiteSetupAudit extends BaseAudit {
  constructor(doc) {
      super(doc);
      this.checkPoints = {
          subdomain: {
              required: true,
              validate: this.checkSubdomain.bind(this)
          },
          websiteTitle: {
              required: true,
              validate: this.checkWebsiteTitle.bind(this)
          },
          favicon: {
              required: true,
              validate: this.checkFavicon.bind(this)
          },
          mainLogo: {
              required: true,
              validate: this.checkMainLogo.bind(this)
          }
      };
  }

    isTitleCase(str) {
        const exceptions = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'];
        return str.split(" ").every((word, index) => {
            const lowercaseWord = word.toLowerCase();
            if (index === 0 || index === str.split(" ").length - 1) {
                return word[0] === word[0].toUpperCase();
            }
            if (exceptions.includes(lowercaseWord)) {
                return word === lowercaseWord;
            }
            if (word.length <= 1) return true;
            return word[0] === word[0].toUpperCase() &&
                word.slice(1) === word.slice(1).toLowerCase();
        });
    }

  checkSubdomain() {
        const currentUrl = window.location.hostname;
        const hasWww = currentUrl.startsWith('www.');

        if (hasWww) {
            this.addIssue(
                "setup",
                "Website URL should not include 'www.' prefix for modern best practices",
                "medium",
                document.documentElement
            );
        }

        const domainParts = currentUrl.replace(/^www\./, '').split('.');
        const hasSubdomain = domainParts.length > 2;

        const subdomainInput = this.doc.querySelector('input[name="subdomain"]');
        if (!subdomainInput) {
            this.addIssue(
                "setup",
                "Subdomain field not found",
                "high"
            );
            return;
        }

        const value = subdomainInput.value.trim().toLowerCase();
        if ((hasSubdomain && value !== "yes") || (!hasSubdomain && value !== "no")) {
            this.addIssue(
                "setup",
                `Subdomain field value '${value}' does not match actual URL configuration. ${
                    hasSubdomain ? "URL contains a subdomain" : "URL does not contain a subdomain"
                }`,
                "high",
                subdomainInput
            );
        }
    }

    checkWebsiteTitle() {
        const titleElement = this.doc.querySelector('title');
        if (!titleElement) {
            this.addIssue(
                "setup",
                "Website Title tag not found",
                "high"
            );
            return;
        }

        const titleValue = titleElement.textContent.trim();
        if (!titleValue) {
            this.addIssue(
                "setup",
                "Website Title is empty",
                "high",
                titleElement
            );
            return;
        }

        if (!this.isTitleCase(titleValue)) {
            this.addIssue(
                "setup",
                "Website Title should be in Title Case (e.g., 'Ford Online Vehicle Reservation')",
                "medium",
                titleElement
            );
        }
    }

  checkFavicon() {
      const favicon = this.doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      if (!favicon) {
          this.addIssue(
              "setup",
              "Favicon not found on page",
              "medium"
          );
          return;
      }

      const faviconUrl = favicon.href;
      if (!faviconUrl) {
          this.addIssue(
              "setup",
              "Favicon link found but URL is missing",
              "medium",
              favicon
          );
          return;
      }

      // Check if favicon exists and is high resolution
      const img = new Image();
      img.onload = () => {
          if (img.width < 64 || img.height < 64) {
              this.addIssue(
                  "setup",
                  "Favicon should be at least 64x64 pixels for high resolution displays",
                  "low",
                  favicon
              );
          }
      };
      img.src = faviconUrl;
  }

  checkMainLogo() {
      const logo = this.doc.querySelector('#desktop-logo .dealer-logo');
      if (!logo) {
          this.addIssue(
              "setup",
              "Main logo not found in header",
              "high"
          );
          return;
      }

      const logoLink = logo.closest('a');
      if (!logoLink) {
          this.addIssue(
              "setup",
              "Logo image found but not wrapped in a link",
              "medium",
              logo
          );
          return;
      }

      if (logoLink.href !== '/' && !logoLink.href.endsWith('/')) {
          this.addIssue(
              "setup",
              "Logo link should direct to homepage",
              "medium",
              logoLink
          );
      }

      // Check logo resolution
      if (logo.naturalWidth < 200 || logo.naturalHeight < 50) {
          this.addIssue(
              "setup",
              "Logo image resolution may be too low for optimal display",
              "medium",
              logo
          );
      }

      // Check alt text
      if (!logo.alt || logo.alt.trim().length === 0) {
          this.addIssue(
              "setup",
              "Logo image missing alt text",
              "medium",
              logo
          );
      }
  }

  audit() {
      // Run all checkpoints
      Object.values(this.checkPoints).forEach(check => {
          if (check.required) {
              check.validate();
          }
      });

      return {
          module: "Website Setup",
          timestamp: new Date().toISOString(),
          issues: this.annotations,
          summary: {
              total: this.annotations.length,
              critical: this.annotations.filter(a => a.severity === "high").length
          }
      };
  }
}

// Main Audit Controller
class WebsiteAudit {
  constructor(html, pageType) {
      const parser = new DOMParser();
      this.doc = parser.parseFromString(html, "text/html");
      this.pageType = pageType;
      this.modules = {
          setup: new WebsiteSetupAudit(this.doc)
          // Additional modules will be added here as they are developed
      };
  }

  async audit() {
      const results = {
          pageType: this.pageType,
          timestamp: new Date().toISOString(),
          modules: {}
      };

      // Run appropriate modules based on page type
      if (this.pageType === "setup" || this.pageType === "all") {
          results.modules.setup = await this.modules.setup.audit();
      }

      return results;
  }
}

// Make available to extension
window.WebsiteAudit = WebsiteAudit;