class WebAnalyzer {
  constructor(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    this.body = doc.body;
    if (!this.body) {
      throw new Error("No body element found in the HTML");
    }
    this.annotations = [];
  }

  analyze() {
    const accessibilityAnalyzer = new AccessibilityAnalyzer(this.body);
    const seoAnalyzer = new SeoAnalyzer(this.body);
    const performanceAnalyzer = new PerformanceAnalyzer(this.body);
    const responsiveAnalyzer = new ResponsiveAnalyzer(this.body);
    const securityAnalyzer = new SecurityAnalyzer(this.body);

    this.annotations = [
      ...accessibilityAnalyzer.analyze(),
      ...seoAnalyzer.analyze(),
      ...performanceAnalyzer.analyze(),
      ...responsiveAnalyzer.analyze(),
      ...securityAnalyzer.analyze(),
    ];

    return {
      annotations: this.annotations,
      meta: {
        timestamp: new Date().toISOString(),
        analyzed_element: "body",
      },
      summary: this.generateSummary(),
    };
  }

  generateSummary() {
    return {
      total_issues: this.annotations.length,
      critical_issues: this.annotations.filter((a) => a.severity === "high")
        .length,
      by_category: this.groupByCategory(),
      by_severity: this.groupBySeverity(),
    };
  }

  groupByCategory() {
    return this.annotations.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});
  }

  groupBySeverity() {
    return this.annotations.reduce((acc, curr) => {
      acc[curr.severity] = (acc[curr.severity] || 0) + 1;
      return acc;
    }, {});
  }
}
