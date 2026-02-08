(function() {
  'use strict';

  // ============ Constants ============
  var BUTTON_HEIGHT = 44;
  var PANEL_WIDTH = 400;
  var Z_INDEX = 2147483647; // Max z-index
  var MAX_DOUBLE_STARS = 2;

  // ============ SDK State ============
  var initialized = false;
  var workspace = null;
  var baseUrl = '';
  var position = 'bottom-right';
  var isOpen = false;
  var iframeReady = false;
  var pendingIdentify = null;
  var button = null;
  var panel = null;
  var backdrop = null;
  var iframe = null;
  var pageRules = [];
  var showLabel = true;
  var eventListeners = {};

  // ============ Event System ============

  function emit(eventName, data) {
    var listeners = eventListeners[eventName];
    if (!listeners) return;
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](data);
      } catch (e) {
        console.error('[Plaudera] Event listener error:', e);
      }
    }
  }

  function handleOn(eventName, callback) {
    if (typeof eventName !== 'string' || typeof callback !== 'function') return;
    if (!eventListeners[eventName]) {
      eventListeners[eventName] = [];
    }
    eventListeners[eventName].push(callback);
  }

  function handleOff(eventName, callback) {
    if (typeof eventName !== 'string' || typeof callback !== 'function') return;
    var listeners = eventListeners[eventName];
    if (!listeners) return;
    for (var i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i] === callback) {
        listeners.splice(i, 1);
      }
    }
  }

  // ============ Glob / Page Rules ============

  function globToRegex(pattern) {
    var result = '';
    var i = 0;
    var doubleStarCount = 0;

    while (i < pattern.length) {
      var ch = pattern[i];

      if (ch === '*' && pattern[i + 1] === '*') {
        doubleStarCount++;
        i += 2;
        if (pattern[i] === '/') i++;

        if (doubleStarCount > MAX_DOUBLE_STARS) {
          result += '[^/]*';
        } else if (result.length > 0 && result[result.length - 1] === '/') {
          result = result.slice(0, -1);
          result += '(?:/.*)?';
        } else {
          result += '.*';
        }
      } else if (ch === '*') {
        result += '[^/]*';
        i++;
      } else if (ch === '?') {
        result += '[^/]';
        i++;
      } else if ('^$.|+()[]{}\\'.indexOf(ch) !== -1) {
        result += '\\' + ch;
        i++;
      } else {
        result += ch;
        i++;
      }
    }

    return new RegExp('^' + result + '$');
  }

  function matchesPageRules(rules) {
    if (!rules || rules.length === 0) return true;
    var pathname = window.location.pathname;
    return rules.some(function(rule) {
      return globToRegex(rule).test(pathname);
    });
  }

  // ============ Settings Fetch ============

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

  // ============ UI: Button ============

  function createButton() {
    button = document.createElement('button');
    button.id = 'plaudera-widget-button';
    button.setAttribute('aria-label', 'Open feedback');
    button.setAttribute('data-plaudera', 'true');

    var collapsedWidth = BUTTON_HEIGHT;
    var expandedWidth = 140;

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

  // ============ UI: Backdrop ============

  function createBackdrop() {
    backdrop = document.createElement('div');
    backdrop.id = 'plaudera-widget-backdrop';
    backdrop.setAttribute('data-plaudera', 'true');

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

  // ============ UI: Panel ============

  function createPanel() {
    panel = document.createElement('div');
    panel.id = 'plaudera-widget-panel';
    panel.setAttribute('data-plaudera', 'true');

    var isLeft = position === 'bottom-left';
    var panelSide = isLeft ? 'left' : 'right';

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
      overflow: 'visible',
    });
    panel.style[panelSide] = '0';

    var closeBtn = document.createElement('button');
    var chevronIcon = isLeft
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    closeBtn.innerHTML = chevronIcon;
    closeBtn.setAttribute('aria-label', 'Close sidebar');
    closeBtn.setAttribute('data-plaudera', 'true');
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '24px',
      height: '40px',
      border: 'none',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#71717a',
      boxShadow: isLeft
        ? '2px 0 8px rgba(0, 0, 0, 0.1)'
        : '-2px 0 8px rgba(0, 0, 0, 0.1)',
      transition: 'background-color 0.2s ease, color 0.2s ease',
      zIndex: '1',
    });
    if (isLeft) {
      closeBtn.style.right = '-12px';
      closeBtn.style.borderRadius = '0 6px 6px 0';
    } else {
      closeBtn.style.left = '-12px';
      closeBtn.style.borderRadius = '6px 0 0 6px';
    }
    closeBtn.onmouseenter = function() {
      closeBtn.style.backgroundColor = '#f4f4f5';
      closeBtn.style.color = '#18181b';
    };
    closeBtn.onmouseleave = function() {
      closeBtn.style.backgroundColor = '#ffffff';
      closeBtn.style.color = '#71717a';
    };
    closeBtn.onclick = closePanel;
    panel.appendChild(closeBtn);

    var iframeContainer = document.createElement('div');
    iframeContainer.setAttribute('data-plaudera', 'true');
    Object.assign(iframeContainer.style, {
      flex: '1',
      overflow: 'hidden',
      borderRadius: '0',
    });

    iframe = document.createElement('iframe');
    iframe.src = baseUrl + '/embed/' + workspace;
    iframe.id = 'plaudera-widget-iframe';
    iframe.setAttribute('data-plaudera', 'true');
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
    });
    iframe.setAttribute('title', 'Feedback Widget');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups');

    iframeContainer.appendChild(iframe);
    panel.appendChild(iframeContainer);
    document.body.appendChild(panel);
  }

  // ============ Panel Control ============

  function togglePanel() {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    if (!initialized || isOpen) return;
    isOpen = true;

    backdrop.style.pointerEvents = 'auto';
    backdrop.style.opacity = '1';
    panel.style.transform = 'translateX(0)';
    button.style.opacity = '0';
    button.style.pointerEvents = 'none';
    document.body.style.overflow = 'hidden';

    emit('open');
  }

  function closePanel() {
    if (!initialized || !isOpen) return;
    isOpen = false;

    var isLeft = position === 'bottom-left';

    backdrop.style.pointerEvents = 'none';
    backdrop.style.opacity = '0';
    panel.style.transform = 'translateX(' + (isLeft ? '-100%' : '100%') + ')';
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
    document.body.style.overflow = '';

    emit('close');
  }

  // ============ Keyboard ============

  function handleKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      closePanel();
    }
  }

  // ============ postMessage Handler ============

  function handleMessage(e) {
    // Validate origin against the base URL of the script
    var scriptOrigin = baseUrl.replace(/\/$/, '');
    if (e.origin !== scriptOrigin) return;

    if (!e.data || typeof e.data !== 'object') return;

    switch (e.data.type) {
      case 'plaudera:close':
        closePanel();
        break;
      case 'plaudera:submitted':
        emit('submitted', e.data);
        break;
      case 'plaudera:ready':
        iframeReady = true;
        emit('ready');
        // Flush any pending identify call
        if (pendingIdentify && iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'plaudera:identify',
            payload: pendingIdentify
          }, scriptOrigin);
          pendingIdentify = null;
        }
        break;
      case 'plaudera:identified':
        emit('identified', e.data.payload);
        break;
      case 'plaudera:logout':
        emit('logout');
        break;
    }
  }

  // ============ Identify ============

  function handleIdentify(opts) {
    if (!opts || typeof opts !== 'object') {
      console.error('[Plaudera] identify() requires an object with { email }');
      return;
    }

    var email = opts.email;
    var name = opts.name || '';

    if (!email || typeof email !== 'string') {
      console.error('[Plaudera] identify() requires a valid email');
      return;
    }

    // Basic email format check
    if (email.indexOf('@') === -1 || email.indexOf('.') === -1) {
      console.error('[Plaudera] identify() received an invalid email');
      return;
    }

    var payload = { email: email, name: name };
    var scriptOrigin = baseUrl.replace(/\/$/, '');

    if (iframeReady && iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'plaudera:identify',
        payload: payload
      }, scriptOrigin);
    } else {
      // Queue until iframe is ready
      pendingIdentify = payload;
    }
  }

  // ============ Destroy ============

  function handleDestroy() {
    if (!initialized) return;

    // Close panel first (restores body scroll)
    if (isOpen) {
      isOpen = false;
      document.body.style.overflow = '';
    }

    // Remove event listeners
    document.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('message', handleMessage);

    // Remove all DOM elements tagged with data-plaudera
    var elements = document.querySelectorAll('[data-plaudera]');
    for (var i = 0; i < elements.length; i++) {
      elements[i].remove();
    }

    // Reset state
    initialized = false;
    workspace = null;
    isOpen = false;
    iframeReady = false;
    pendingIdentify = null;
    button = null;
    panel = null;
    backdrop = null;
    iframe = null;
    pageRules = [];
    showLabel = true;
    eventListeners = {};
  }

  // ============ Init ============

  function handleInit(opts) {
    if (initialized) {
      console.warn('[Plaudera] Already initialized. Call destroy() first to re-initialize.');
      return;
    }

    if (!opts || !opts.workspace) {
      console.error('[Plaudera] init() requires { workspace: "your-workspace-id" }');
      return;
    }

    workspace = opts.workspace;

    // Position can be overridden in init, but will be updated from API
    if (opts.position) {
      position = opts.position;
    }

    initialized = true;

    // If identify was passed in init options, queue it
    if (opts.user && opts.user.email) {
      pendingIdentify = { email: opts.user.email, name: opts.user.name || '' };
    }

    loadAndSetup();
  }

  function loadAndSetup() {
    fetchSettings().then(function() {
      if (!matchesPageRules(pageRules)) return;
      if (!initialized) return; // Guard against destroy during fetch
      setup();
    });
  }

  function setup() {
    createButton();
    createBackdrop();
    createPanel();

    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('message', handleMessage);

    emit('ready');
  }

  // ============ SDK Function ============

  function PlauderaSDK() {
    var args = Array.prototype.slice.call(arguments);
    var method = args[0];

    switch (method) {
      case 'init':
        return handleInit(args[1]);
      case 'open':
        return openPanel();
      case 'close':
        return closePanel();
      case 'destroy':
        return handleDestroy();
      case 'identify':
        return handleIdentify(args[1]);
      case 'on':
        return handleOn(args[1], args[2]);
      case 'off':
        return handleOff(args[1], args[2]);
      default:
        console.warn('[Plaudera] Unknown method:', method);
    }
  }

  // ============ Derive Base URL ============

  function deriveBaseUrl() {
    // Try to find the widget script by scanning all script tags
    var scripts = document.querySelectorAll('script[src*="widget.js"]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf('widget.js') !== -1) {
        return src.substring(0, src.lastIndexOf('/'));
      }
    }
    // Fallback: use current page origin
    return window.location.origin;
  }

  // ============ Bootstrap ============

  function bootstrap() {
    baseUrl = deriveBaseUrl();

    // Capture any queued commands from the stub
    var queue = (window.Plaudera && window.Plaudera.q) || [];

    // Replace the stub with the real SDK function
    window.Plaudera = PlauderaSDK;

    // Check for legacy data-attribute initialization (backwards compat)
    var legacyScripts = document.querySelectorAll('script[data-workspace]');
    for (var i = 0; i < legacyScripts.length; i++) {
      var scriptEl = legacyScripts[i];
      var ws = scriptEl.dataset.workspace;
      if (ws) {
        var legacyPosition = scriptEl.dataset.position || 'bottom-right';
        // Only auto-init if no init command was queued
        var hasInitInQueue = queue.some(function(cmd) { return cmd[0] === 'init'; });
        if (!hasInitInQueue) {
          queue.push(['init', { workspace: ws, position: legacyPosition }]);
          break; // Only handle the first one
        }
      }
    }

    // Replay queued commands
    for (var j = 0; j < queue.length; j++) {
      PlauderaSDK.apply(null, queue[j]);
    }
  }

  // Wait for DOM ready, then bootstrap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
