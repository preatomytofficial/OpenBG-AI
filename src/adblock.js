// AdBlocker Detection & Locker for OpenBG AI
(function() {
  // 1. Create the overlay HTML dynamically so we don't pollute the HTML pages
  function injectOverlay() {
    if (document.getElementById('adblock-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'adblock-overlay';
    overlay.className = 'fixed inset-0 bg-black/95 backdrop-blur-2xl z-[999999] flex items-center justify-center p-4 hidden';
    overlay.innerHTML = `
      <div class="max-w-md w-full bg-slate-900/95 border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden group">
        <!-- Ambient Red Glow -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500 pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500 pointer-events-none"></div>

        <!-- Icon -->
        <div class="mx-auto w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-950/50">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <!-- Title -->
        <h2 class="text-2xl font-bold tracking-tight text-white mb-3">AdBlocker Detected!</h2>
        
        <!-- Description -->
        <p class="text-slate-300 text-sm leading-relaxed mb-6">
          We detected that you are using an adblocker. <span class="text-cyan-400 font-semibold">OpenBG AI</span> is a free high-performance background removal service. We rely on ads to cover our extensive AI server costs and keep our tools free.
        </p>

        <div class="bg-slate-950/50 border border-white/5 rounded-2xl p-4 mb-6 text-left">
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">How to unlock the website:</h3>
          <ol class="text-xs text-slate-400 space-y-2 list-decimal list-inside">
            <li>Open your AdBlocker extension settings (e.g. uBlock, AdBlock, Brave Shield).</li>
            <li>Select <span class="text-emerald-400 font-medium">"Disable on this site"</span> or pause it.</li>
            <li>Click the verification button below to continue using the application.</li>
          </ol>
        </div>

        <!-- Button -->
        <button id="btn-recheck-adblock" class="w-full inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-lg shadow-red-950/40 transform active:scale-[0.98] cursor-pointer">
          <span id="btn-recheck-text">I have disabled AdBlocker</span>
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Setup listener
    document.getElementById('btn-recheck-adblock').addEventListener('click', async function() {
      const btnText = document.getElementById('btn-recheck-text');
      btnText.innerText = 'Verifying connection...';
      
      const hasAdBlock = await detectAdBlock();
      if (!hasAdBlock) {
        // Success! Hide overlay and reload
        overlay.classList.add('hidden');
        window.location.reload();
      } else {
        // Still blocked
        btnText.innerText = 'AdBlocker still active! Try again';
        setTimeout(() => {
          btnText.innerText = 'I have disabled AdBlocker';
        }, 3000);
      }
    });
  }

  // 2. Multi-strategy AdBlocker detection (fetchless, highly robust, no CORS/sandboxing issues)
  function detectAdBlock() {
    return new Promise((resolve) => {
      // Strategy A: Check standard bait element with heavy ad keywords
      const bait = document.createElement('div');
      // Common ad classes that ad blockers block/hide
      bait.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads banner-ad ad-image adsbox sponsored-post ad-container advertisement';
      bait.setAttribute('style', 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -10000px !important; display: block !important; opacity: 1 !important; visibility: visible !important;');
      document.body.appendChild(bait);

      // Short wait for blocker to apply hiding rules
      setTimeout(() => {
        const styles = window.getComputedStyle(bait);
        const isBaitBlocked = (
          styles.display === 'none' ||
          styles.visibility === 'hidden' ||
          bait.offsetHeight === 0 ||
          bait.clientHeight === 0
        );
        document.body.removeChild(bait);

        if (isBaitBlocked) {
          console.log("[AdBlocker] Detected via bait element styling.");
          resolve(true);
          return;
        }

        // Strategy B: Create a bait script tag for a standard ad url
        const scriptBait = document.createElement('script');
        // A well-known ad script URL that any adblocker will block
        scriptBait.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        scriptBait.async = true;
        
        let resolved = false;
        
        scriptBait.onload = () => {
          if (!resolved) {
            resolved = true;
            try { document.body.removeChild(scriptBait); } catch (e) {}
            resolve(false);
          }
        };
        
        scriptBait.onerror = () => {
          if (!resolved) {
            resolved = true;
            try { document.body.removeChild(scriptBait); } catch (e) {}
            console.log("[AdBlocker] Detected via script load failure (AdBlock blocked the script).");
            resolve(true);
          }
        };

        // Set a timeout in case some adblocker silently blocks without firing error/load,
        // but avoid false-positives under slow network conditions.
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { document.body.removeChild(scriptBait); } catch (e) {}
            resolve(false);
          }
        }, 1200);

        document.body.appendChild(scriptBait);
      }, 50);
    });
  }

  // 3. Main runner
  async function runBlockCheck() {
    // Inject overlay if not present
    injectOverlay();

    // Bypass check in sandboxed/development environments to avoid iframe-specific script blocks and block loops
    const host = window.location.hostname;
    const isSandboxOrDev = (
      window.self !== window.top || // Inside an iframe (e.g. AI Studio development and preview)
      host.includes('localhost') || 
      host.includes('127.0.0.1') || 
      host.includes('ais-dev-') || 
      host.includes('ais-pre-')
    );

    if (isSandboxOrDev) {
      console.log("[AdBlocker] Running in a sandboxed, local, or preview environment. Bypassing blocker overlay check.");
      const overlay = document.getElementById('adblock-overlay');
      if (overlay) overlay.classList.add('hidden');
      document.body.style.overflow = '';
      return;
    }

    const hasAdBlock = await detectAdBlock();
    const overlay = document.getElementById('adblock-overlay');
    if (hasAdBlock) {
      overlay.classList.remove('hidden');
      // Prevent scrolling on body
      document.body.style.overflow = 'hidden';
    } else {
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runBlockCheck);
  } else {
    runBlockCheck();
  }

  // Run periodic rechecks in case adblock is enabled mid-session
  setInterval(runBlockCheck, 10000);
})();
