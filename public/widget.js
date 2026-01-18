(function() {
  'use strict';

  // Get config from script tag
  var script = document.currentScript;
  if (!script) {
    console.error('[Plaudera] Could not find script element');
    return;
  }

  var workspace = script.dataset.workspace;
  var position = script.dataset.position || 'bottom-right';

  if (!workspace) {
    console.error('[Plaudera] Missing data-workspace attribute');
    return;
  }

  // Derive the base URL from the script src
  var scriptSrc = script.src;
  var baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));

  // State
  var isOpen = false;
  var button = null;
  var panel = null;
  var backdrop = null;
  var iframe = null;

  // Styles
  var BUTTON_SIZE = 56;
  var PANEL_WIDTH = 400;
  var Z_INDEX = 2147483647; // Max z-index

  // Create floating button
  function createButton() {
    button = document.createElement('button');
    button.id = 'plaudera-widget-button';
    button.setAttribute('aria-label', 'Open feedback');

    // Base styles
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '20px',
      [position === 'bottom-left' ? 'left' : 'right']: '20px',
      width: BUTTON_SIZE + 'px',
      height: BUTTON_SIZE + 'px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: '#18181b', // zinc-900
      color: '#ffffff',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: Z_INDEX,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });

    // Icon (lightbulb emoji or SVG)
    button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';

    // Hover effect
    button.onmouseenter = function() {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    };
    button.onmouseleave = function() {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    };

    button.onclick = togglePanel;

    document.body.appendChild(button);
  }

  // Create backdrop
  function createBackdrop() {
    backdrop = document.createElement('div');
    backdrop.id = 'plaudera-widget-backdrop';

    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      zIndex: Z_INDEX - 2,
      opacity: '0',
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
    });

    backdrop.onclick = closePanel;
    document.body.appendChild(backdrop);
  }

  // Create side panel
  function createPanel() {
    panel = document.createElement('div');
    panel.id = 'plaudera-widget-panel';

    var isLeft = position === 'bottom-left';

    Object.assign(panel.style, {
      position: 'fixed',
      top: '0',
      [isLeft ? 'left' : 'right']: '0',
      width: PANEL_WIDTH + 'px',
      height: '100%',
      maxHeight: '100vh',
      backgroundColor: '#ffffff',
      boxShadow: isLeft
        ? '4px 0 24px rgba(0, 0, 0, 0.15)'
        : '-4px 0 24px rgba(0, 0, 0, 0.15)',
      zIndex: Z_INDEX - 1,
      transform: 'translateX(' + (isLeft ? '-100%' : '100%') + ')',
      transition: 'transform 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    });

    // Header with close button
    var header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #e4e4e7',
      backgroundColor: '#fafafa',
    });

    var title = document.createElement('span');
    title.textContent = 'Feedback';
    Object.assign(title.style, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '600',
      fontSize: '14px',
      color: '#18181b',
    });

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    closeBtn.setAttribute('aria-label', 'Close');
    Object.assign(closeBtn.style, {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#71717a',
      borderRadius: '4px',
    });
    closeBtn.onmouseenter = function() {
      closeBtn.style.backgroundColor = '#e4e4e7';
    };
    closeBtn.onmouseleave = function() {
      closeBtn.style.backgroundColor = 'transparent';
    };
    closeBtn.onclick = closePanel;

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Iframe container
    var iframeContainer = document.createElement('div');
    Object.assign(iframeContainer.style, {
      flex: '1',
      overflow: 'hidden',
    });

    iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/embed/' + workspace;
    iframe.id = 'plaudera-widget-iframe';
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
    });
    iframe.setAttribute('title', 'Feedback Widget');
    iframe.setAttribute('loading', 'lazy');

    iframeContainer.appendChild(iframe);
    panel.appendChild(iframeContainer);

    document.body.appendChild(panel);
  }

  // Toggle panel
  function togglePanel() {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  // Open panel
  function openPanel() {
    if (isOpen) return;
    isOpen = true;

    // Show backdrop
    backdrop.style.pointerEvents = 'auto';
    backdrop.style.opacity = '1';

    // Slide in panel
    panel.style.transform = 'translateX(0)';

    // Hide button
    button.style.opacity = '0';
    button.style.pointerEvents = 'none';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // Close panel
  function closePanel() {
    if (!isOpen) return;
    isOpen = false;

    var isLeft = position === 'bottom-left';

    // Hide backdrop
    backdrop.style.pointerEvents = 'none';
    backdrop.style.opacity = '0';

    // Slide out panel
    panel.style.transform = 'translateX(' + (isLeft ? '-100%' : '100%') + ')';

    // Show button
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';

    // Restore body scroll
    document.body.style.overflow = '';
  }

  // Handle keyboard events
  function handleKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      closePanel();
    }
  }

  // Handle messages from iframe
  function handleMessage(e) {
    // Verify origin (in production, check against your domain)
    if (!e.data || typeof e.data !== 'object') return;

    switch (e.data.type) {
      case 'plaudera:close':
        closePanel();
        break;
      case 'plaudera:submitted':
        // Optionally close after submit or show success
        break;
    }
  }

  // Initialize widget
  function init() {
    // Wait for DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    createButton();
    createBackdrop();
    createPanel();

    // Event listeners
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('message', handleMessage);
  }

  // Start
  init();
})();
