import { useState } from 'react'

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.cu-root{font-family:'DM Serif Display',serif;min-height:100vh;background:#f6f7f8;display:flex}
.cu-sidebar{width:210px;background:#fff;border-right:1px solid #e8ebe8;display:flex;flex-direction:column;min-height:100vh;}
.cu-sb-logo{padding:18px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e8ebe8}
.cu-sb-icon{width:28px;height:28px;background:#1a6b3c;border-radius:6px;display:flex;align-items:center;justify-content:center}
.cu-main{flex:1;display:flex;flex-direction:column;overflow:auto}
.cu-top{background:#fff;border-bottom:1px solid #e8ebe8;padding:16px 28px;display:flex;align-items:center;justify-content:space-between}
.cu-content{padding:28px}
.cu-hero{background:linear-gradient(90deg,#1a6b3c,#2b7e4a);color:#fff;border-radius:14px;padding:22px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.cu-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.cu-card{background:#fff;border-radius:12px;padding:16px}
.cu-small{font-size:12px;color:#a0b0a0}
.cu-large{font-size:20px;color:#1a2e1a}
/* Responsive rules */
@media (max-width:900px){
  .cu-root{display:block}
  .cu-sidebar{width:100%;height:auto;display:flex;align-items:center;padding:10px}
  .cu-sb-logo{padding:10px}
  .cu-main{padding-top:8px}
  .cu-content{padding:14px}
  .cu-cards{grid-template-columns:repeat(2,1fr)}
}
@media (max-width:600px){
  .cu-cards{grid-template-columns:1fr}
  .cu-hero{flex-direction:column;align-items:flex-start;padding:16px}
  .cu-hero div{width:100%}
}
`

export default function CustomerDashboard(){
  const [active]=useState('home')
  return (
    <>
      <style>{S}</style>
      <div className="cu-root">
        <aside className="cu-sidebar">
          <div className="cu-sb-logo">
            <div className="cu-sb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg></div>
            <span>PestPro</span>
          </div>
        </aside>

        <div className="cu-main">
          <div className="cu-top">
            <div>My Account</div>
            <div>Welcome back — Customer</div>
          </div>

          <div className="cu-content">
            <div className="cu-hero">
              <div>
                <div style={{fontSize:22,fontWeight:600}}>Your next treatment is in 4 days</div>
                <div style={{marginTop:6,fontSize:13}}>View appointment details and payment history</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12}}>Balance</div>
                <div style={{fontSize:20,fontWeight:700}}>₹0.00</div>
              </div>
            </div>

            <div className="cu-cards">
              <div className="cu-card">
                <div className="cu-small">Last treatment</div>
                <div className="cu-large">Quarterly Yard</div>
              </div>
              <div className="cu-card">
                <div className="cu-small">Upcoming</div>
                <div className="cu-large">Inspection — 4 days</div>
              </div>
              <div className="cu-card">
                <div className="cu-small">Help</div>
                <div className="cu-large">Contact Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
