import { useState } from 'react'

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.ad-root{font-family:'DM Serif Display',serif;min-height:100vh;background:#f0f2f0;display:flex;}

/* Sidebar */
.ad-sidebar{width:210px;background:#fff;border-right:1px solid #e8ebe8;display:flex;flex-direction:column;min-height:100vh;position:sticky;top:0;}
.ad-sb-logo{padding:18px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e8ebe8;}
.ad-sb-icon{width:28px;height:28px;background:#1a6b3c;border-radius:6px;display:flex;align-items:center;justify-content:center;}
.ad-sb-icon svg{width:15px;height:15px;fill:white;}
.ad-sb-brand{font-size:16px;color:#1a2e1a;}
.ad-sb-nav{padding:16px 12px;flex:1;}
.ad-sb-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:2px;transition:background .15s;color:#5a6e5a;font-size:13.5px;}
.ad-sb-item:hover{background:#f0f2f0;}
.ad-sb-item.active{background:#edf6f1;color:#1a6b3c;}
.ad-sb-item svg{width:16px;height:16px;flex-shrink:0;}
.ad-sb-user{padding:16px;border-top:1px solid #e8ebe8;display:flex;align-items:center;gap:10px;}
.ad-sb-avatar{width:34px;height:34px;background:#1a2e1a;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.ad-sb-uname{font-size:13px;color:#1a2e1a;}
.ad-sb-urole{font-size:11px;color:#a0b0a0;}

/* Main */
.ad-main{flex:1;display:flex;flex-direction:column;overflow:auto;}
.ad-topbar{background:#fff;border-bottom:1px solid #e8ebe8;padding:0 28px;height:52px;display:flex;align-items:center;justify-content:space-between;}
.ad-topbar-crumb{font-size:12px;color:#a0b0a0;}
.ad-topbar-crumb span{color:#1a2e1a;font-size:14px;}
.ad-topbar-actions{display:flex;align-items:center;gap:10px;}
.ad-search{background:#f7f9f7;border:1.5px solid #e2e8e2;border-radius:9px;padding:7px 14px;font-family:'DM Serif Display',serif;font-size:13px;color:#1a2e1a;outline:none;width:200px;}
.ad-new-btn{background:#1a6b3c;color:#fff;border:none;border-radius:9px;padding:8px 18px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;transition:background .15s;}
.ad-new-btn:hover{background:#155a32;}

/* Content */
.ad-content{padding:24px 28px;}
.ad-page-title{font-size:22px;color:#1a2e1a;margin-bottom:2px;}
.ad-page-sub{font-size:13px;color:#a0b0a0;margin-bottom:22px;}

/* Stats row */
.ad-stats{display:grid;grid-template-columns:repeat(3,1fr) 200px;gap:14px;margin-bottom:22px;}
.ad-stat{background:#fff;border-radius:14px;padding:20px;box-shadow:0 1px 8px rgba(0,0,0,0.05);}
.ad-stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#a0b0a0;margin-bottom:8px;}
.ad-stat-val{font-size:28px;color:#1a2e1a;letter-spacing:-1px;}
.ad-stat-sub{font-size:12px;color:#7a8c7a;margin-top:4px;}
.ad-stat-up{color:#1a6b3c;}
.ad-stat-down{color:#e74c3c;}
.ad-stat-chip{display:inline-flex;align-items:center;gap:4px;background:#edf6f1;color:#1a6b3c;border-radius:6px;padding:2px 8px;font-size:11px;margin-top:6px;}
.ad-stat-warn{background:#fff8ec;color:#e6a817;}
.ad-stat-danger{background:#fde8e8;color:#e74c3c;}

/* Two col main */
.ad-row{display:grid;grid-template-columns:1fr 300px;gap:18px;margin-bottom:18px;}

/* Chart card */
.ad-card{background:#fff;border-radius:16px;padding:22px;box-shadow:0 2px 12px rgba(0,0,0,0.05);}
.ad-card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;}
.ad-card-title{font-size:16px;color:#1a2e1a;}
.ad-card-sub{font-size:12px;color:#a0b0a0;margin-top:2px;}
.ad-chart-legend{display:flex;gap:14px;}
.ad-legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:#7a8c7a;}
.ad-legend-dot{width:8px;height:8px;border-radius:50%;}

/* Bar chart */
.ad-bars{display:flex;align-items:flex-end;gap:10px;height:140px;padding-bottom:4px;}
.ad-bar-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;}
.ad-bar-group{display:flex;gap:3px;align-items:flex-end;}
.ad-bar{border-radius:4px 4px 0 0;width:18px;transition:opacity .2s;}
.ad-bar:hover{opacity:.8;}
.ad-bar-label{font-size:10px;color:#a0b0a0;}

/* Top metrics right */
.ad-metrics{display:flex;flex-direction:column;gap:10px;}
.ad-metric-row{background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 1px 8px rgba(0,0,0,0.05);}
.ad-metric-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.ad-metric-name{font-size:13px;color:#1a2e1a;}
.ad-metric-pct{font-size:12px;color:#a0b0a0;}
.ad-metric-bar{height:7px;background:#f0f2f0;border-radius:4px;overflow:hidden;}
.ad-metric-fill{height:100%;border-radius:4px;background:#1a6b3c;}
.ad-metric-sub{font-size:11.5px;color:#7a8c7a;margin-top:6px;}
.ad-green-card{background:linear-gradient(135deg,#1a4d2e,#1a6b3c);border-radius:14px;padding:18px;color:#fff;}
.ad-green-card-title{font-size:13px;opacity:.8;margin-bottom:10px;}
.ad-green-card-val{font-size:22px;margin-bottom:8px;}
.ad-green-card-sub{font-size:12px;opacity:.7;margin-bottom:14px;line-height:1.5;}
.ad-green-card-btn{width:100%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:9px;padding:9px;font-family:'DM Serif Display',serif;font-size:13px;cursor:pointer;}

/* Recent jobs */
.ad-jobs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.ad-jobs-title{font-size:16px;color:#1a2e1a;}
.ad-jobs-link{font-size:12.5px;color:#1a6b3c;text-decoration:none;cursor:pointer;}
.ad-job-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f0f2f0;}
.ad-job-row:last-child{border-bottom:none;}
.ad-job-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;}
.ad-job-info{flex:1;}
.ad-job-name{font-size:13.5px;color:#1a2e1a;}
.ad-job-meta{font-size:12px;color:#a0b0a0;}
.ad-job-amount{font-size:14px;color:#1a2e1a;margin-left:auto;}
.ad-job-tag{display:inline-block;padding:2px 9px;border-radius:6px;font-size:11px;margin-right:8px;}
.ad-job-tag.done{background:#edf6f1;color:#1a6b3c;}
.ad-job-tag.pending{background:#fff8ec;color:#e6a817;}
.ad-job-tag.cancelled{background:#fde8e8;color:#e74c3c;}

/* Responsive: tablet and mobile */
@media (max-width: 900px) {
  .ad-root{flex-direction:column}
  /* On smaller screens keep sidebar compact and not full-height */
  .ad-sidebar{width:100%;height:auto;min-height:unset;display:flex;flex-direction:row;align-items:center;padding:10px 12px;position:relative;border-right:none;border-bottom:1px solid #e8ebe8}
  .ad-sb-logo{padding:8px 12px}
  .ad-sb-nav{display:none}
  .ad-sb-user{display:none}
  .ad-main{padding-top:8px}
  .ad-topbar{padding:8px 12px;height:auto}
  .ad-search{width:120px}
  .ad-content{padding:16px}
  .ad-stats{grid-template-columns:repeat(2,1fr) 160px}
  .ad-row{grid-template-columns:1fr}
}

@media (max-width: 600px) {
  .ad-stats{grid-template-columns:1fr}
  .ad-bars{height:100px}
  .ad-page-title{font-size:18px}
  .ad-card{padding:12px}
  .ad-new-btn{padding:8px 12px}
  .ad-search{display:none}
}
`

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug']
const barData = [
  {r:55,t:40},{r:70,t:50},{r:60,t:45},{r:90,t:65},{r:100,t:70},{r:85,t:60},{r:110,t:75},{r:120,t:80}
]

const recentJobs = [
  {initials:'MJ',color:'#1a6b3c',name:'Marcus Johnson',meta:'Pest Control · Sycamore Park',status:'done',amount:'₹2,400'},
  {initials:'SR',color:'#2d9e5c',name:'Sarah Roberts',meta:'Termite Inspection · Clayfield',status:'pending',amount:'₹3,800'},
  {initials:'TM',color:'#1a4d2e',name:'Tyler Morris',meta:'Rodent Proofing · Eastview',status:'done',amount:'₹1,900'},
  {initials:'LP',color:'#e6a817',name:'Linda Park',meta:'Mosquito Treatment · Northside',status:'cancelled',amount:'₹2,100'},
]

export default function AdminDashboard() {
  const [active,setActive]=useState('overview')
  const navItems=[
    {id:'overview',label:'Dashboard',icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
    {id:'staff',label:'Staff Management',icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
    {id:'team',label:'Team Performance',icon:'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'},
    {id:'jobs',label:'Job Orders',icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},
    {id:'payments',label:'Payments',icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'},
    {id:'reports',label:'Reports & Analytics',icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'},
    {id:'system',label:'System Settings',icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'},
  ]

  return (
    <>
      <style>{S}</style>
      <div className="ad-root">
        <aside className="ad-sidebar">
          <div className="ad-sb-logo">
            <div className="ad-sb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/></svg></div>
            <span className="ad-sb-brand">PestPro</span>
          </div>
          <nav className="ad-sb-nav">
            {navItems.map(n=>(
              <div key={n.id} className={`ad-sb-item${active===n.id?' active':''}`} onClick={()=>setActive(n.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={n.icon}/></svg>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="ad-sb-user">
            <div className="ad-sb-avatar">AD</div>
            <div>
              <div className="ad-sb-uname">Admin User</div>
              <div className="ad-sb-urole">Administrator</div>
            </div>
          </div>
        </aside>

        <div className="ad-main">
          <div className="ad-topbar">
            <div className="ad-topbar-crumb">Overview &nbsp;›&nbsp; <span>Service Analytics</span></div>
            <div className="ad-topbar-actions">
              <input className="ad-search" placeholder="Search anything…"/>
              <button className="ad-new-btn">+ New Report</button>
            </div>
          </div>

          <div className="ad-content">
            <div className="ad-page-title">Service Analytics</div>
            <div className="ad-page-sub">Comprehensive overview of operations, revenue, and team performance.</div>

            {/* Stats */}
            <div className="ad-stats">
              <div className="ad-stat">
                <div className="ad-stat-label">Total Revenue</div>
                <div className="ad-stat-val">₹48,230</div>
                <div className="ad-stat-sub"><span className="ad-stat-up">↑ 12.4%</span> vs last month</div>
              </div>
              <div className="ad-stat">
                <div className="ad-stat-label">Jobs This Month</div>
                <div className="ad-stat-val">24<span style={{fontSize:16,color:'#a0b0a0'}}>/26</span></div>
                <div className="ad-stat-sub">92% completion rate</div>
              </div>
              <div className="ad-stat">
                <div className="ad-stat-label">Active Staff</div>
                <div className="ad-stat-val">112</div>
                <div className="ad-stat-sub"><span className="ad-stat-up">↑ 5</span> new this month</div>
              </div>
              <div className="ad-stat">
                <div className="ad-stat-label">Pending Alerts</div>
                <div className="ad-stat-val" style={{color:'#e74c3c'}}>2</div>
                <span className="ad-stat-chip ad-stat-danger">Needs Action</span>
              </div>
            </div>

            {/* Chart + Metrics */}
            <div className="ad-row">
              <div className="ad-card">
                <div className="ad-card-header">
                  <div>
                    <div className="ad-card-title">Monthly Service Trends</div>
                    <div className="ad-card-sub">Revenue vs Treatment Volume</div>
                  </div>
                  <div className="ad-chart-legend">
                    <div className="ad-legend-item"><div className="ad-legend-dot" style={{background:'#1a6b3c'}}/> Revenue</div>
                    <div className="ad-legend-item"><div className="ad-legend-dot" style={{background:'#a8d5ba'}}/> Treatments</div>
                  </div>
                </div>
                {/* Bar chart */}
                <div className="ad-bars">
                  {barData.map((b,i)=>(
                    <div className="ad-bar-wrap" key={i}>
                      <div className="ad-bar-group">
                        <div className="ad-bar" style={{height:`${b.r}px`,background:'#1a6b3c'}}/>
                        <div className="ad-bar" style={{height:`${b.t}px`,background:'#a8d5ba'}}/>
                      </div>
                      <div className="ad-bar-label">{months[i]}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ad-metrics">
                {[
                  {name:'Top Performer — Marcus M.',sub:'38 jobs completed · 4.9★',pct:95},
                  {name:'Highest Revenue — North District',sub:'₹18,400 this month',pct:76},
                  {name:'Most Active Service — Pest Control',sub:'142 treatments completed',pct:60},
                ].map((m,i)=>(
                  <div className="ad-metric-row" key={i}>
                    <div className="ad-metric-top">
                      <div className="ad-metric-name">{m.name}</div>
                      <div className="ad-metric-pct">{m.pct}%</div>
                    </div>
                    <div className="ad-metric-bar"><div className="ad-metric-fill" style={{width:`${m.pct}%`}}/></div>
                    <div className="ad-metric-sub">{m.sub}</div>
                  </div>
                ))}
                <div className="ad-green-card">
                  <div className="ad-green-card-title">Eco-Safe Programme</div>
                  <div className="ad-green-card-val">98% Compliant</div>
                  <div className="ad-green-card-sub">All treatments this month used certified non-toxic chemicals. Zero reported adverse incidents.</div>
                  <button className="ad-green-card-btn">View Compliance Report</button>
                </div>
              </div>
            </div>

            {/* Recent jobs */}
            <div className="ad-card">
              <div className="ad-jobs-header">
                <div className="ad-jobs-title">Recent Job Orders</div>
                <span className="ad-jobs-link">View all →</span>
              </div>
              {recentJobs.map((j,i)=>(
                <div className="ad-job-row" key={i}>
                  <div className="ad-job-av" style={{background:j.color}}>{j.initials}</div>
                  <div className="ad-job-info">
                    <div className="ad-job-name">{j.name}</div>
                    <div className="ad-job-meta">{j.meta}</div>
                  </div>
                  <span className={`ad-job-tag ${j.status}`}>{j.status==='done'?'Completed':j.status==='pending'?'Pending':'Cancelled'}</span>
                  <div className="ad-job-amount">{j.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}