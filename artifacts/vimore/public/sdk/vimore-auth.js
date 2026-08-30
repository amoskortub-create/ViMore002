(function (global) {
  'use strict';

  var BASE_URL = 'https://vimore.cfd';

  var STYLES = [
    '.vimore-btn{display:inline-flex;align-items:center;gap:10px;padding:0 20px;height:48px;background:#7C3AED;color:#fff;border:none;border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;font-weight:800;letter-spacing:.02em;cursor:pointer;text-decoration:none;transition:background .15s,transform .1s,box-shadow .15s;box-shadow:0 4px 14px rgba(124,58,237,.35);white-space:nowrap;user-select:none}',
    '.vimore-btn:hover{background:#6D28D9;box-shadow:0 6px 20px rgba(124,58,237,.45)}',
    '.vimore-btn:active{transform:scale(.97)}',
    '.vimore-btn--white{background:#fff;color:#7C3AED;box-shadow:0 4px 14px rgba(0,0,0,.12);border:1.5px solid #e9d5ff}',
    '.vimore-btn--white:hover{background:#faf5ff;box-shadow:0 6px 20px rgba(0,0,0,.16)}',
    '.vimore-btn--sm{height:38px;padding:0 14px;font-size:12px;border-radius:10px}',
    '.vimore-btn--lg{height:56px;padding:0 28px;font-size:16px;border-radius:18px}',
    '.vimore-btn__icon{width:22px;height:22px;flex-shrink:0}',
    '.vimore-btn__text{line-height:1}'
  ].join('');

  var LOGO_SVG = '<svg class="vimore-btn__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="currentColor" fill-opacity=".15"/><path d="M4 8L9.5 17L15 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.5 14L15 8L18.5 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function injectStyles() {
    if (document.getElementById('vimore-sdk-styles')) return;
    var el = document.createElement('style');
    el.id = 'vimore-sdk-styles';
    el.textContent = STYLES;
    document.head.appendChild(el);
  }

  function buildAuthUrl(opts) {
    var params = new URLSearchParams({
      client_id: opts.clientId,
      redirect_uri: opts.redirectUri,
      response_type: 'code',
      scope: opts.scope || 'profile',
    });
    if (opts.state) params.set('state', opts.state);
    return BASE_URL + '/oauth/authorize?' + params.toString();
  }

  function createButton(opts) {
    injectStyles();

    if (!opts || !opts.clientId || !opts.redirectUri) {
      console.error('[ViMoreAuth] createButton requires clientId and redirectUri');
      return null;
    }

    var label = opts.label || 'Sign in with ViMore';
    var variant = opts.variant || 'purple'; // 'purple' | 'white'
    var size = opts.size || 'md'; // 'sm' | 'md' | 'lg'
    var authUrl = buildAuthUrl(opts);

    var btn = document.createElement('a');
    btn.href = authUrl;
    btn.className = 'vimore-btn' +
      (variant === 'white' ? ' vimore-btn--white' : '') +
      (size === 'sm' ? ' vimore-btn--sm' : '') +
      (size === 'lg' ? ' vimore-btn--lg' : '');

    if (opts.popup) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var w = 480, h = 640;
        var left = (screen.width / 2) - (w / 2);
        var top = (screen.height / 2) - (h / 2);
        var popup = window.open(
          authUrl,
          'vimore_auth',
          'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',toolbar=no,menubar=no'
        );
        if (opts.onOpen) opts.onOpen(popup);

        var timer = setInterval(function () {
          if (!popup || popup.closed) {
            clearInterval(timer);
            if (opts.onClose) opts.onClose();
          }
        }, 500);

        window.addEventListener('message', function handler(event) {
          if (event.origin !== BASE_URL) return;
          if (event.data && event.data.type === 'vimore_oauth_callback') {
            clearInterval(timer);
            window.removeEventListener('message', handler);
            if (popup) popup.close();
            if (opts.onSuccess) opts.onSuccess(event.data);
          }
        });
      });
    }

    var span = document.createElement('span');
    span.className = 'vimore-btn__text';
    span.textContent = label;
    var iconEl = document.createElement('span');
    iconEl.innerHTML = LOGO_SVG;
    btn.appendChild(iconEl.firstChild);
    btn.appendChild(span);

    if (opts.container) {
      var el = typeof opts.container === 'string'
        ? document.querySelector(opts.container)
        : opts.container;
      if (el) el.appendChild(btn);
    }

    return btn;
  }

  function init() {
    injectStyles();
    var targets = document.querySelectorAll('[data-vimore-client-id]');
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      if (el.dataset.vimoreMounted) continue;
      el.dataset.vimoreMounted = '1';
      var btn = createButton({
        clientId: el.dataset.vimoreClientId,
        redirectUri: el.dataset.vimoreRedirectUri || window.location.href,
        scope: el.dataset.vimoreScope || 'profile',
        state: el.dataset.vimoreState,
        label: el.dataset.vimoreLabel || 'Sign in with ViMore',
        variant: el.dataset.vimoreVariant || 'purple',
        size: el.dataset.vimoreSize || 'md',
        popup: el.dataset.vimorePopup === 'true',
      });
      if (btn) el.appendChild(btn);
    }
  }

  var ViMoreAuth = { createButton: createButton, init: init, buildAuthUrl: buildAuthUrl };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViMoreAuth;
  } else {
    global.ViMoreAuth = ViMoreAuth;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : this);
