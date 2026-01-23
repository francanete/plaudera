(function() {
  'use strict';

  // Get config from script tag
  const script = document.currentScript;
  if (!script) {
    console.error('[Plaudera] Could not find script element');
    return;
  }

  const workspace = script.dataset.workspace;
  const fallbackPosition = script.dataset.position || 'bottom-right';
  let position = fallbackPosition; // Will be updated from API

  if (!workspace) {
    console.error('[Plaudera] Missing data-workspace attribute');
    return;
  }

  // Derive the base URL from the script src
  const scriptSrc = script.src;
  const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));

  // State
  let isOpen = false;
  let button = null;
  let panel = null;
  let backdrop = null;
  let iframe = null;

  // Styles
  const BUTTON_HEIGHT = 44;
  const PANEL_WIDTH = 400;
  const Z_INDEX = 2147483647; // Max z-index

  // Page rules (populated from API)
  let pageRules = [];
  let showLabel = true; // Whether to show "Feedback" text on hover

  // Convert a glob pattern to a RegExp
  const MAX_DOUBLE_STARS = 2;

  function globToRegex(pattern) {
    let result = '';
    let i = 0;
    let doubleStarCount = 0;

    while (i < pattern.length) {
      const ch = pattern[i];

      if (ch === '*' && pattern[i + 1] === '*') {
        // ** matches any path segments including /
        doubleStarCount++;
        i += 2;
        if (pattern[i] === '/') i++;

        if (doubleStarCount > MAX_DOUBLE_STARS) {
          // Degrade to single-segment match to prevent ReDoS
          result += '[^/]*';
        } else if (result.length > 0 && result[result.length - 1] === '/') {
          // /docs/** → also matches /docs (make trailing segments optional)
          result = result.slice(0, -1);
          result += '(?:/.*)?';
        } else {
          result += '.*';
        }
      } else if (ch === '*') {
        // * matches any characters except /
        result += '[^/]*';
        i++;
      } else if (ch === '?') {
        // ? matches any single character except /
        result += '[^/]';
        i++;
      } else if ('^$.|+()[]{}\\'.indexOf(ch) !== -1) {
        // Escape regex special characters (? excluded — handled above)
        result += '\\' + ch;
        i++;
      } else {
        result += ch;
        i++;
      }
    }

    return new RegExp('^' + result + '$');
  }

  // Check if current page matches any page rule
  function matchesPageRules(rules) {
    if (!rules || rules.length === 0) return true;
    const pathname = window.location.pathname;
    return rules.some(function(rule) {
      return globToRegex(rule).test(pathname);
    });
  }

  // Fetch widget settings from API
  function fetchSettings() {
    return fetch(baseUrl + '/api/public/' + workspace + '/settings')
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        return response.json();
      })
      .then(function(data) {
        if (data.position) {
          position = data.position;
        }
        if (data.pageRules) {
          pageRules = data.pageRules;
        }
        if (data.showLabel !== undefined) {
          showLabel = data.showLabel;
        }
      })
      .catch(function(error) {
        console.warn('[Plaudera] Could not fetch settings, using fallback:', error.message);
      });
  }

  // Create floating button (pill shape, expands on hover to show label)
  function createButton() {
    button = document.createElement('button');
    button.id = 'plaudera-widget-button';
    button.setAttribute('aria-label', 'Open feedback');

    var collapsedWidth = BUTTON_HEIGHT; // Circular when collapsed
    var expandedWidth = 140; // Pill width when expanded with text

    // Base styles - starts as a circle (icon only)
    var buttonSide = position === 'bottom-left' ? 'left' : 'right';
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '20px',
      width: collapsedWidth + 'px',
      height: BUTTON_HEIGHT + 'px',
      borderRadius: (BUTTON_HEIGHT / 2) + 'px',
      border: 'none',
      backgroundColor: '#18181b',
      color: '#ffffff',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: Z_INDEX,
      display: 'flex',
      alignItems: 'center',
      justifyContent: showLabel ? 'flex-start' : 'center',
      gap: '8px',
      paddingLeft: showLabel ? '12px' : '0',
      paddingRight: showLabel ? '12px' : '0',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      transition: 'width 0.3s ease, box-shadow 0.2s ease, transform 0.2s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });
    button.style[buttonSide] = '20px';

    // Icon
    var iconSpan = document.createElement('span');
    Object.assign(iconSpan.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      width: '20px',
      height: '20px',
    });
    iconSpan.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';

    // Label text (hidden initially, revealed on hover)
    var labelSpan = document.createElement('span');
    labelSpan.textContent = 'Feedback';
    Object.assign(labelSpan.style, {
      fontSize: '14px',
      fontWeight: '500',
      opacity: '0',
      transition: 'opacity 0.2s ease 0.1s',
      pointerEvents: 'none',
    });

    button.appendChild(iconSpan);
    if (showLabel) {
      button.appendChild(labelSpan);
    }

    // Hover: expand to show label
    button.onmouseenter = function() {
      if (showLabel) {
        button.style.width = expandedWidth + 'px';
        labelSpan.style.opacity = '1';
      }
      button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    };
    button.onmouseleave = function() {
      if (showLabel) {
        button.style.width = collapsedWidth + 'px';
        labelSpan.style.opacity = '0';
      }
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    };

    // Focus ring for keyboard navigation (accessibility)
    button.onfocus = function() {
      button.style.outline = 'none';
      if (showLabel) {
        button.style.width = expandedWidth + 'px';
        labelSpan.style.opacity = '1';
      }
      button.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)';
    };
    button.onblur = function() {
      if (showLabel) {
        button.style.width = collapsedWidth + 'px';
        labelSpan.style.opacity = '0';
      }
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

    const isLeft = position === 'bottom-left';
    const panelSide = isLeft ? 'left' : 'right';

    Object.assign(panel.style, {
      position: 'fixed',
      top: '0',
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
    panel.style[panelSide] = '0';

    // Header with close button
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #e4e4e7',
      backgroundColor: '#fafafa',
    });

    const title = document.createElement('span');
    title.textContent = 'Feedback';
    Object.assign(title.style, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '600',
      fontSize: '14px',
      color: '#18181b',
    });

    const closeBtn = document.createElement('button');
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
    const iframeContainer = document.createElement('div');
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
    // Security: Sandbox restricts iframe capabilities to only what's needed
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups');

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

    const isLeft = position === 'bottom-left';

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
    // Security: Only trust the origin that served this script
    // The scriptOrigin is derived from script.src, which is the source of truth
    const scriptOrigin = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present

    // Validate that message comes from the same origin as the script
    if (e.origin !== scriptOrigin) {
      console.warn('[Plaudera] Ignored message from untrusted origin:', e.origin);
      return;
    }

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
      document.addEventListener('DOMContentLoaded', loadAndSetup);
    } else {
      loadAndSetup();
    }
  }

  function loadAndSetup() {
    // Fetch settings from API first, then check page rules before setup
    fetchSettings().then(function() {
      if (!matchesPageRules(pageRules)) return;
      setup();
    });
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
