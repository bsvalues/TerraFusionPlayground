class TerraFusionApp {
  constructor() {
    this.apiUrl = '/api';
    this.statusCheckInterval = 5000;
    this.metricsUpdateInterval = 2000;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.lastProcessedData = null;
    this.undoStack = [];
    this.redoStack = [];
    this.isProcessing = false;
    this.rateLimiter = {
      lastRequest: 0,
      minInterval: 1000
    };

    this.initializeElements();
    this.setupEventListeners();
    this.setupErrorBoundary();
    this.setupOfflineSupport();
    this.setupServiceWorker();
    this.checkApiStatus();
    this.startMetricsPolling();
  }

  initializeElements() {
    this.systemStatus = document.getElementById('systemStatus');
    this.inputData = document.getElementById('inputData');
    this.processButton = document.getElementById('processButton');
    this.loadingSpinner = document.getElementById('loadingSpinner');
    this.resultsContainer = document.getElementById('resultsContainer');
    this.resultsContent = document.getElementById('resultsContent');
    this.errorBoundary = document.getElementById('error-boundary');
    this.errorMessage = document.getElementById('error-message');
    this.reloadButton = document.getElementById('reload-button');
    this.offlineNotice = document.getElementById('offline-notice');
  }

  setupEventListeners() {
    this.processButton.addEventListener('click', () => this.processData());
    this.inputData.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.processData();
      }
    });
    this.reloadButton.addEventListener('click', () => window.location.reload());
    window.addEventListener('online', () => this.handleOnlineStatus());
    window.addEventListener('offline', () => this.handleOfflineStatus());
    window.addEventListener('error', (e) => this.handleGlobalError(e));
    window.addEventListener('unhandledrejection', (e) => this.handlePromiseError(e));
  }

  setupErrorBoundary() {
    this.errorBoundary.style.display = 'none';
    this.reloadButton.addEventListener('click', () => {
      this.errorBoundary.style.display = 'none';
      this.initializeApp();
    });
  }

  setupOfflineSupport() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    }
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    }
  }

  async checkApiStatus() {
    try {
      const response = await this.makeApiRequest('GET', '/status');
      this.updateSystemStatus(response.status);
    } catch (error) {
      this.handleError('Failed to check API status', error);
    }
  }

  async startMetricsPolling() {
    setInterval(async () => {
      try {
        const metrics = await this.fetchMetrics();
        this.updateMetrics(metrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, this.metricsUpdateInterval);
  }

  async processData() {
    if (this.isProcessing) return;
    if (!this.checkRateLimit()) return;

    const input = this.inputData.value.trim();
    if (!input) {
      this.showError('Please enter data to process');
      return;
    }

    this.isProcessing = true;
    this.showLoading();
    this.saveToUndoStack(input);

    try {
      const startTime = performance.now();
      const response = await this.makeApiRequest('POST', '/process', { data: input });
      const processingTime = performance.now() - startTime;

      this.lastProcessedData = response;
      this.displayResults(response, processingTime);
      this.updateMetrics(response.metrics);
    } catch (error) {
      this.handleError('Failed to process data', error);
    } finally {
      this.isProcessing = false;
      this.hideLoading();
    }
  }

  async makeApiRequest(method, endpoint, data = null) {
    const url = `${this.apiUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    };

    if (data) {
      options.body = JSON.stringify(this.sanitizeInput(data));
    }

    let attempts = 0;
    while (attempts < this.retryAttempts) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        attempts++;
        if (attempts === this.retryAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
      }
    }
  }

  sanitizeInput(data) {
    if (typeof data === 'string') {
      return data.replace(/[<>]/g, '');
    }
    if (typeof data === 'object') {
      return Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = this.sanitizeInput(value);
        return acc;
      }, {});
    }
    return data;
  }

  checkRateLimit() {
    const now = Date.now();
    if (now - this.rateLimiter.lastRequest < this.rateLimiter.minInterval) {
      this.showError('Please wait before making another request');
      return false;
    }
    this.rateLimiter.lastRequest = now;
    return true;
  }

  saveToUndoStack(data) {
    this.undoStack.push(data);
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length > 0) {
      const currentData = this.inputData.value;
      this.redoStack.push(currentData);
      this.inputData.value = this.undoStack.pop();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const currentData = this.inputData.value;
      this.undoStack.push(currentData);
      this.inputData.value = this.redoStack.pop();
    }
  }

  displayResults(data, processingTime) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    resultItem.innerHTML = `
      <div class="result-content">
        <pre>${this.sanitizeInput(data.result)}</pre>
      </div>
      <div class="result-meta">
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
        <span class="processing-time">${processingTime.toFixed(2)}ms</span>
      </div>
    `;
    this.resultsContent.insertBefore(resultItem, this.resultsContent.firstChild);
  }

  updateMetrics(metrics) {
    if (!metrics) return;

    Object.entries(metrics).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (element) {
        element.textContent = this.formatMetricValue(key, value);
      }
    });
  }

  formatMetricValue(key, value) {
    switch (key) {
      case 'cpuUsage':
      case 'memoryUsage':
        return `${value}%`;
      case 'responseTime':
        return `${value}ms`;
      case 'securityStatus':
        return value;
      default:
        return value;
    }
  }

  showLoading() {
    this.processButton.disabled = true;
    this.processButton.setAttribute('aria-busy', 'true');
    this.loadingSpinner.style.display = 'flex';
  }

  hideLoading() {
    this.processButton.disabled = false;
    this.processButton.setAttribute('aria-busy', 'false');
    this.loadingSpinner.style.display = 'none';
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.resultsContent.insertBefore(errorDiv, this.resultsContent.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  handleError(message, error) {
    console.error(message, error);
    this.showError(message);
    this.hideLoading();
  }

  handleGlobalError(event) {
    this.showErrorBoundary('An unexpected error occurred');
    console.error('Global error:', event.error);
  }

  handlePromiseError(event) {
    this.showErrorBoundary('A promise was rejected');
    console.error('Promise error:', event.reason);
  }

  showErrorBoundary(message) {
    this.errorMessage.textContent = message;
    this.errorBoundary.style.display = 'flex';
  }

  handleOnlineStatus() {
    this.offlineNotice.style.display = 'none';
    this.checkApiStatus();
  }

  handleOfflineStatus() {
    this.offlineNotice.style.display = 'block';
  }

  updateSystemStatus(status) {
    this.systemStatus.textContent = status;
    this.systemStatus.className = `status-value ${status.toLowerCase()}`;
  }
}

// Initialize the application
const app = new TerraFusionApp(); 