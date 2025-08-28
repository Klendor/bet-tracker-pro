// Content script for Bet Tracker Pro - Screenshot capture and area selection
class BetTrackerCapture {
  constructor() {
    this.isCapturing = false;
    this.overlay = null;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.selectionBox = null;
    
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'startCapture') {
        this.startCapture();
        sendResponse({ success: true });
      }
    });
  }

  startCapture() {
    if (this.isCapturing) return;
    
    this.isCapturing = true;
    this.createOverlay();
    this.showInstructions();
  }

  createOverlay() {
    // Create minimal transparent overlay for capture
    this.overlay = document.createElement('div');
    this.overlay.id = 'bet-tracker-overlay';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100vw';
    this.overlay.style.height = '100vh';
    this.overlay.style.zIndex = '999999';
    this.overlay.style.background = 'transparent'; // Completely transparent
    this.overlay.style.cursor = 'crosshair';
    this.overlay.style.userSelect = 'none';
    
    document.body.appendChild(this.overlay);
    
    // Show simple instruction tooltip
    this.showTooltip('Click and drag to select bet slip area. Press ESC to cancel.');
    
    // Setup event listeners
    this.setupEventListeners();
  }

  showTooltip(message) {
    this.tooltip = document.createElement('div');
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.top = '20px';
    this.tooltip.style.left = '50%';
    this.tooltip.style.transform = 'translateX(-50%)';
    this.tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    this.tooltip.style.color = 'white';
    this.tooltip.style.padding = '10px 15px';
    this.tooltip.style.borderRadius = '6px';
    this.tooltip.style.fontSize = '14px';
    this.tooltip.style.zIndex = '1000000';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.textContent = message;
    document.body.appendChild(this.tooltip);
  }

  setupEventListeners() {
    // Bind methods to preserve 'this' context
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    
    // Mouse events for selection - directly on overlay
    this.overlay.addEventListener('mousedown', this.onMouseDown.bind(this));
    
    // ESC key to cancel
    document.addEventListener('keydown', this.boundOnKeyDown);
  }

  onMouseDown(e) {
    console.log('Starting selection...');
    
    // Get coordinates relative to viewport
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.isSelecting = true;
    
    // Hide tooltip
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
    
    // Create selection box
    this.selectionBox = document.createElement('div');
    this.selectionBox.style.position = 'fixed';
    this.selectionBox.style.left = this.startX + 'px';
    this.selectionBox.style.top = this.startY + 'px';
    this.selectionBox.style.width = '0px';
    this.selectionBox.style.height = '0px';
    this.selectionBox.style.border = '2px solid #00ff00';
    this.selectionBox.style.background = 'rgba(0, 255, 0, 0.1)';
    this.selectionBox.style.pointerEvents = 'none';
    this.selectionBox.style.zIndex = '1000001';
    this.selectionBox.style.boxSizing = 'border-box';
    
    document.body.appendChild(this.selectionBox);
    
    // Add mouse move and up listeners
    document.addEventListener('mousemove', this.boundOnMouseMove);
    document.addEventListener('mouseup', this.boundOnMouseUp);
    
    e.preventDefault();
    e.stopPropagation();
  }

  onMouseMove(e) {
    if (!this.selectionBox || !this.isSelecting) return;
    
    this.endX = e.clientX;
    this.endY = e.clientY;
    
    // Calculate selection rectangle
    const left = Math.min(this.startX, this.endX);
    const top = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);
    
    // Update selection box
    this.selectionBox.style.left = left + 'px';
    this.selectionBox.style.top = top + 'px';
    this.selectionBox.style.width = width + 'px';
    this.selectionBox.style.height = height + 'px';
    
    // Show dimensions
    this.selectionBox.innerHTML = `<div style="position: absolute; top: -25px; left: 0; background: rgba(0,0,0,0.8); color: white; padding: 2px 8px; font-size: 12px; border-radius: 3px; font-family: monospace;">${width} × ${height}</div>`;
  }

  async onMouseUp(e) {
    if (!this.selectionBox || !this.isSelecting) return;
    
    this.isSelecting = false;
    
    // Remove mouse listeners
    document.removeEventListener('mousemove', this.boundOnMouseMove);
    document.removeEventListener('mouseup', this.boundOnMouseUp);
    
    // Calculate final selection
    const left = Math.min(this.startX, this.endX);
    const top = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);
    
    // Check minimum size
    if (width < 20 || height < 20) {
      this.showTooltip('Selection too small. Try again.');
      this.removeSelectionBox();
      setTimeout(() => this.cancelCapture(), 2000);
      return;
    }
    
    console.log('=== IMMEDIATE CAPTURE ===');
    console.log('Selection:', { left, top, width, height });
    
    // Show capture feedback
    this.selectionBox.style.border = '3px solid #00ff00';
    this.selectionBox.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,255,0,0.9); color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">📸 CAPTURING...</div>';
    
    try {
      // Immediate capture without confirmation
      await this.immediateCapture({ left, top, width, height });
    } catch (error) {
      console.error('Capture failed:', error);
      this.showTooltip('Capture failed: ' + error.message);
      setTimeout(() => this.cancelCapture(), 3000);
    }
  }

  async immediateCapture(selection) {
    try {
      console.log('Starting immediate capture with selection:', selection);
      
      // Capture the selected area
      const canvas = await this.captureArea(selection);
      
      if (!canvas) {
        throw new Error('Failed to create canvas from selection');
      }
      
      console.log('Canvas created:', { width: canvas.width, height: canvas.height });
      
      // Convert to image data with maximum quality
      const imageData = canvas.toDataURL('image/png', 1.0);
      
      if (!imageData || imageData.length < 1000) {
        throw new Error('Generated image data is too small or empty');
      }
      
      console.log('Image data generated, length:', imageData.length);
      
      // Show debug preview immediately
      this.showDebugPreview(imageData, selection);
      
      // Send to background for AI processing
      console.log('Sending to background for processing...');
      chrome.runtime.sendMessage({
        action: 'processBetSlip',
        imageData: imageData,
        selection: selection
      });
      
      // Clean up and close
      this.cleanup();
      
    } catch (error) {
      console.error('Error in immediateCapture:', error);
      throw error;
    }
  }

  showDebugPreview(imageData, selection) {
    const debugImg = document.createElement('img');
    debugImg.src = imageData;
    debugImg.style.position = 'fixed';
    debugImg.style.top = '10px';
    debugImg.style.right = '10px';
    debugImg.style.zIndex = '999999';
    debugImg.style.maxWidth = '300px';
    debugImg.style.maxHeight = '200px';
    debugImg.style.border = '3px solid #00ff00';
    debugImg.style.backgroundColor = 'white';
    debugImg.style.padding = '5px';
    debugImg.style.borderRadius = '5px';
    debugImg.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    debugImg.title = `Captured: ${selection.width}×${selection.height}`;
    
    const label = document.createElement('div');
    label.style.position = 'fixed';
    label.style.top = '10px';
    label.style.right = '320px';
    label.style.zIndex = '999999';
    label.style.background = 'rgba(0, 255, 0, 0.9)';
    label.style.color = 'white';
    label.style.padding = '5px 10px';
    label.style.borderRadius = '3px';
    label.style.fontSize = '12px';
    label.style.fontWeight = 'bold';
    label.textContent = '✅ CAPTURED';
    
    document.body.appendChild(debugImg);
    document.body.appendChild(label);
    
    // Remove after 8 seconds
    setTimeout(() => {
      debugImg.remove();
      label.remove();
    }, 8000);
  }

  removeSelectionBox() {
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
  }

  cancelCapture() {
    this.cleanup();
  }

  onKeyDown(e) {
    if (e.key === 'Escape') {
      this.cancelCapture();
    }
  }

  cleanup() {
    this.isCapturing = false;
    this.isSelecting = false;
    
    // Remove event listeners using bound methods
    if (this.boundOnMouseMove) {
      document.removeEventListener('mousemove', this.boundOnMouseMove);
      this.boundOnMouseMove = null;
    }
    if (this.boundOnMouseUp) {
      document.removeEventListener('mouseup', this.boundOnMouseUp);
      this.boundOnMouseUp = null;
    }
    if (this.boundOnKeyDown) {
      document.removeEventListener('keydown', this.boundOnKeyDown);
      this.boundOnKeyDown = null;
    }
    
    // Remove elements
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  async captureArea(selection) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Capturing area with selection:', selection);
        
        // Capture the entire visible tab
        chrome.runtime.sendMessage({
          action: 'captureVisibleTab'
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          
          console.log('Full screenshot captured, now cropping...');
          
          // Create an image element to load the full screenshot
          const fullImg = new Image();
          fullImg.onload = () => {
            try {
              console.log('Full image loaded:', { width: fullImg.width, height: fullImg.height });
              
              // Create a canvas for the cropped image
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Set canvas size to match selection
              canvas.width = selection.width;
              canvas.height = selection.height;
              
              // Calculate device pixel ratio for proper scaling
              const dpr = window.devicePixelRatio || 1;
              console.log('Device pixel ratio:', dpr);
              
              // Scale coordinates for high-DPI displays
              const sourceX = selection.left * dpr;
              const sourceY = selection.top * dpr;
              const sourceWidth = selection.width * dpr;
              const sourceHeight = selection.height * dpr;
              
              console.log('Cropping parameters:', {
                sourceX, sourceY, sourceWidth, sourceHeight,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
              });
              
              // Validate and adjust crop bounds
              const adjustedX = Math.max(0, Math.min(sourceX, fullImg.width));
              const adjustedY = Math.max(0, Math.min(sourceY, fullImg.height));
              const adjustedWidth = Math.min(sourceWidth, fullImg.width - adjustedX);
              const adjustedHeight = Math.min(sourceHeight, fullImg.height - adjustedY);
              
              // Draw the cropped area onto the canvas
              ctx.drawImage(
                fullImg,
                adjustedX, adjustedY, adjustedWidth, adjustedHeight,
                0, 0, canvas.width, canvas.height
              );
              
              console.log('Image cropped successfully');
              resolve(canvas);
              
            } catch (cropError) {
              console.error('Error cropping image:', cropError);
              reject(new Error('Failed to crop selected area: ' + cropError.message));
            }
          };
          
          fullImg.onerror = () => {
            reject(new Error('Failed to load captured screenshot'));
          };
          
          fullImg.src = response.dataUrl;
        });
        
      } catch (error) {
        console.error('Error in captureArea:', error);
        reject(error);
      }
    });
  }
}

// Initialize capture system
if (!window.betTrackerCaptureInstance) {
  window.betTrackerCaptureInstance = new BetTrackerCapture();
}