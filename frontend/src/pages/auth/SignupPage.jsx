import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/axios'

export default function SignupPage() {
  const navigate = useNavigate()

  const [tab, setTab] = useState('customer') // 'customer' | 'provider'

  const [formData, setFormData] = useState({
    username:   '',
    email:      '',
    password:   '',
    password2:  '',
    first_name: '',
    last_name:  '',
    phone:      '',
    role:       'technician',
  })

  const [showPass, setShowPass]   = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [error, setError]         = useState('')
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrors({})

    if (formData.password !== formData.password2) {
      setErrors({ password2: 'Passwords do not match.' })
      return
    }
    if (formData.password.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters.' })
      return
    }

    setLoading(true)
    try {
      if (tab === 'provider') {
        // Service provider (technician / supervisor) -> staff register
        await api.post('/staff/register/', formData)
      } else {
        // Customer signup -> use public customer register endpoint
        const payload = {
          name: formData.first_name || '',
          email: formData.email || '',
          phone: formData.phone || '',
          company_name: formData.company_name || ''
        }
        await api.post('/auth/customer/register/', payload)
      }
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data
        if (typeof data === 'object') setErrors(data)
        else setError('Registration failed. Please try again.')
      } else {
        setError('Network error. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
          .success-root {
            font-family: 'DM Sans', sans-serif;
            min-height: 100vh;
            background: #f0f2f0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .success-box { text-align: center; }
          .success-icon {
            width: 72px; height: 72px;
            background: #1a6b3c;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
          }
          .success-icon svg { width: 34px; height: 34px; }
          .success-h { font-family: 'DM Serif Display', serif; font-size: 26px; color: #1a2e1a; margin: 0 0 8px; }
          .success-p { color: #7a8c7a; font-size: 14px; margin: 0 0 10px; }
          .success-redirect { color: #1a6b3c; font-size: 13px; font-weight: 500; }
        `}</style>
        <div className="success-root">
          <div className="success-box">
            <div className="success-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 className="success-h">Account Created!</h2>
            <p className="success-p">Your account has been created successfully.</p>
            <p className="success-redirect">Redirecting to login page…</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        .signup-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #f0f2f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }

        /* Nav */
        .su-nav {
          width: 100%;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          background: #fff;
          border-bottom: 1px solid #e8ebe8;
          box-sizing: border-box;
        }
        .su-nav-logo { display: flex; align-items: center; gap: 8px; }
        .su-nav-icon {
          width: 28px; height: 28px;
          background: #1a6b3c;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
        }
        .su-nav-icon svg { width: 16px; height: 16px; fill: white; }
        .su-nav-name {
          font-family: 'DM Serif Display', serif;
          font-size: 17px; color: #1a2e1a;
        }

        /* Main */
        .su-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 28px 16px;
          box-sizing: border-box;
        }

        /* Card */
        .su-card {
          background: #fff;
          border-radius: 20px;
          padding: 36px 32px 32px;
          width: 100%;
          max-width: 390px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.08);
        }

        .su-title {
          font-family: 'DM Serif Display', serif;
          font-size: 26px;
          color: #1a2e1a;
          margin: 0 0 5px;
          letter-spacing: -0.4px;
        }
        .su-subtitle {
        font-family: 'DM Serif Display', serif;
          font-size: 13px;
          color: #7a8c7a;
          margin: 0 0 22px;
          line-height: 1.4;
        }

        /* Tab switcher */
        .su-tabs {
          display: flex;
          background: #f0f2f0;
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 24px;
          gap: 4px;
        }
        .su-tab {
          flex: 1;
          padding: 9px 0;
          border: none;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.18s, color 0.18s, box-shadow 0.18s;
          background: transparent;
          color: #7a8c7a;
        }
        .su-tab.active {
          background: #fff;
          color: #1a2e1a;
          box-shadow: 0 1px 6px rgba(0,0,0,0.1);
        }

        /* Error */
        .su-error {
          background: #fff3f3;
          border: 1px solid #f5c6c6;
          color: #c0392b;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px;
          margin-bottom: 18px;
        }

        /* Fields */
        .su-field { margin-bottom: 15px; }
        .su-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #3d4f3d;
          margin-bottom: 6px;
        }
        .su-field-wrap { position: relative; }
        .su-field-icon {
          position: absolute;
          left: 12px; top: 50%;
          transform: translateY(-50%);
          color: #b0c0b0;
          display: flex; align-items: center;
        }
        .su-field-icon svg { width: 15px; height: 15px; }
        .su-input {
          width: 100%;
          box-sizing: border-box;
          background: #f7f9f7;
          border: 1.5px solid #e2e8e2;
          border-radius: 10px;
          padding: 11px 14px 11px 38px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          color: #1a2e1a;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .su-input::placeholder { color: #c0cfc0; }
        .su-input:focus {
          border-color: #1a6b3c;
          box-shadow: 0 0 0 3px rgba(26,107,60,0.08);
          background: #fff;
        }
        .su-input.has-error { border-color: #e74c3c; }
        .su-field-error { color: #e74c3c; font-size: 11.5px; margin-top: 5px; display: flex; align-items: center; gap: 4px; }
        .su-field-error svg { width: 12px; height: 12px; flex-shrink: 0; }

        .su-pass-toggle {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer; color: #b0c0b0;
          padding: 0; display: flex; align-items: center;
        }
        .su-pass-toggle svg { width: 16px; height: 16px; }

        /* Name row */
        .su-name-row { display: flex; gap: 12px; margin-bottom: 15px; }
        .su-name-row .su-field { flex: 1; margin-bottom: 0; }

        /* Select */
        .su-select {
          width: 100%;
          box-sizing: border-box;
          background: #f7f9f7;
          border: 1.5px solid #e2e8e2;
          border-radius: 10px;
          padding: 11px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          color: #1a2e1a;
          outline: none;
          cursor: pointer;
          transition: border-color 0.18s;
          appearance: none;
        }
        .su-select:focus { border-color: #1a6b3c; }
        .su-hint { font-size: 11.5px; color: #a0b0a0; margin-top: 4px; }

        /* Submit */
        .su-btn {
          width: 100%;
          background: #1a6b3c;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 13px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 6px;
          transition: background 0.18s, transform 0.12s;
          letter-spacing: 0.1px;
        }
        .su-btn:hover:not(:disabled) { background: #155a32; transform: translateY(-1px); }
        .su-btn:disabled { background: #6aab85; cursor: not-allowed; }

        /* Login link */
        .su-login-row {
          text-align: center;
          margin-top: 18px;
          font-size: 13.5px;
          color: #7a8c7a;
        }
        .su-login-row a { color: #1a6b3c; font-weight: 600; text-decoration: none; }
        .su-login-row a:hover { text-decoration: underline; }

        /* Trust badges */
        .su-badges {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #eef1ee;
        }
        .su-badge {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .su-badge-icon {
          width: 32px; height: 32px;
          background: #edf6f1;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .su-badge-icon svg { width: 16px; height: 16px; color: #1a6b3c; }
        .su-badge-text { display: flex; flex-direction: column; }
        .su-badge-title { font-size: 12px; font-weight: 600; color: #1a2e1a; }
        .su-badge-sub { font-size: 10.5px; color: #a0b0a0; text-transform: uppercase; letter-spacing: 0.3px; }

        /* Footer */
        .su-footer {
          width: 100%;
          padding: 16px 28px;
          background: #fff;
          border-top: 1px solid #e8ebe8;
          text-align: center;
          box-sizing: border-box;
        }
        .su-footer-name { font-family: 'DM Serif Display', serif; font-size: 13px; color: #3d4f3d; margin-bottom: 2px; }
        .su-footer-copy { font-size: 11px; color: #a0b0a0; margin-bottom: 7px; }
        .su-footer-links { display: flex; justify-content: center; gap: 18px; }
        .su-footer-links a { font-size: 11px; color: #7a8c7a; text-decoration: none; }
        .su-footer-links a:hover { color: #1a6b3c; }
      `}</style>

      <div className="signup-root">
        {/* Nav */}
        <nav className="su-nav">
          <div className="su-nav-logo">
            <div className="su-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
            </div>
            <span className="su-nav-name">PestPro</span>
          </div>
        </nav>

        <main className="su-main">
          <div className="su-card">
            <h1 className="su-title">Create Account</h1>
            <p className="su-subtitle">Join PestPro to safeguard your home with eco-safe environmental stewardship.</p>

            {/* Tab switcher */}
            <div className="su-tabs"> 
  <button
    type="button"
    className={`su-tab${tab === 'customer' ? ' active' : ''}`}
    style={{ fontFamily: "'DM Serif Display', serif" }}
    onClick={() => setTab('customer')}
  >Customer</button>
  
  <button 
    type="button"
    className={`su-tab${tab === 'provider' ? ' active' : ''}`}
    style={{ fontFamily: "'DM Serif Display', serif" }}
    onClick={() => { 
      setTab('provider'); 
      setFormData(f => ({ ...f, role: 'technician' })) 
    }}
  >
    Service Provider
  </button>
</div>

            {error && <div className="su-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Full Name (customer) / First + Last (provider) */}
              {tab === 'customer' ? (
                <div className="su-field">
                  <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Full Name
                  </label>
                  <div className="su-field-wrap">
                    <span className="su-field-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </span>
                    <input
                      className={`su-input${errors.first_name ? ' has-error' : ''}`}
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.first_name && (
                    <div className="su-field-error">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                      {errors.first_name}
                    </div>
                  )}
                </div>
              ) : (
                <div className="su-name-row">
                  <div className="su-field">
                    <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      First Name
                    </label>
                    <div className="su-field-wrap">
                      <span className="su-field-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </span>
                      <input className={`su-input${errors.first_name ? ' has-error' : ''}`} type="text" name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="John"/>
                    </div>
                    {errors.first_name && <div className="su-field-error">{errors.first_name}</div>}
                  </div>
                  <div className="su-field">
                    <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      Last Name
                    </label>
                    <div className="su-field-wrap">
                      <span className="su-field-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </span>
                      <input className={`su-input${errors.last_name ? ' has-error' : ''}`} type="text" name="last_name" value={formData.last_name} onChange={handleChange} required placeholder="Doe"/>
                    </div>
                    {errors.last_name && <div className="su-field-error">{errors.last_name}</div>}
                  </div>
                </div>
              )}

              {/* Username (provider only) */}
              {tab === 'provider' && (
                <div className="su-field">
                  <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Username
                  </label>
                  <div className="su-field-wrap">
                    <span className="su-field-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="4"/>
                        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
                      </svg>
                    </span>
                    <input className={`su-input${errors.username ? ' has-error' : ''}`} type="text" name="username" value={formData.username} onChange={handleChange} required placeholder="johndoe"/>
                  </div>
                  {errors.username && <div className="su-field-error">{errors.username}</div>}
                </div>
              )}

              {/* Email */}
              <div className="su-field">
                <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Email Address
                </label>
                <div className="su-field-wrap">
                  <span className="su-field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input className={`su-input${errors.email ? ' has-error' : ''}`} type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com"/>
                </div>
                {errors.email && <div className="su-field-error">{errors.email}</div>}
              </div>

              {/* Phone */}
              <div className="su-field">
                <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Phone Number
                </label>
                <div className="su-field-wrap">
                  <span className="su-field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.13 6.13l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </span>
                  <input className={`su-input${errors.phone ? ' has-error' : ''}`} type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(555) 000-0000"/>
                </div>
                {errors.phone && <div className="su-field-error">{errors.phone}</div>}
              </div>

              {/* Role (provider only) */}
              {tab === 'provider' && (
                <div className="su-field">
                  <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Role
                  </label>
                  <select name="role" value={formData.role} onChange={handleChange} className="su-select">
                    <option value="technician">Technician</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                  {errors.role && <div className="su-field-error">{errors.role}</div>}
                  <p className="su-hint">Admin accounts are created by system administrator only.</p>
                </div>
              )}

              {/* Password */}
              <div className="su-field">
                <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Password
                </label>
                <div className="su-field-wrap">
                  <span className="su-field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    className={`su-input${errors.password ? ' has-error' : ''}`}
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                  />
                  <button type="button" className="su-pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div className="su-field-error">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    {Array.isArray(errors.password) ? errors.password.join(' ') : errors.password}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="su-field">
                <label className="su-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Confirm Password
                </label>
                <div className="su-field-wrap">
                  <span className="su-field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </span>
                  <input
                    className={`su-input${errors.password2 ? ' has-error' : ''}`}
                    type={showPass2 ? 'text' : 'password'}
                    name="password2"
                    value={formData.password2}
                    onChange={handleChange}
                    required
                    placeholder="Re-enter your password"
                  />
                  <button type="button" className="su-pass-toggle" onClick={() => setShowPass2(!showPass2)}>
                    {showPass2 ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password2 && (
                  <div className="su-field-error">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    {Array.isArray(errors.password2) ? errors.password2.join(' ') : errors.password2}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="su-btn" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {loading ? 'Creating Account…' : 'Sign Up'}
              </button>
            </form>

            <div className="su-login-row" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Already have an account? <Link to="/login">Log In</Link>
            </div>

            {/* Trust badges */}
            <div className="su-badges">
              <div className="su-badge">
                <div className="su-badge-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="su-badge-text">
                  <span className="su-badge-title" style={{ fontFamily: "'DM Serif Display', serif" }}>Eco-Safe Certified</span>
                  <span className="su-badge-sub">Non-toxic formula</span>
                </div>
              </div>
              <div className="su-badge">
                <div className="su-badge-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                </div>
                <div className="su-badge-text">
                  <span className="su-badge-title" style={{ fontFamily: "'DM Serif Display', serif" }}>Pro Protection</span>
                  <span className="su-badge-sub">Verified experts</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="su-footer">
          <div className="su-footer-name">PestPro</div>
          <div className="su-footer-copy" style={{ fontFamily: "'DM Serif Display', serif" }}>© 2026 PestPro Environmental Stewardship. Eco-Safe Certified.</div>
          <div className="su-footer-links">
            <a href="#" style={{ fontFamily: "'DM Serif Display', serif" }}>Privacy Policy</a>
            <a href="#" style={{ fontFamily: "'DM Serif Display', serif" }}>Terms of Service</a>
            <a href="#" style={{ fontFamily: "'DM Serif Display', serif" }}>Help Center</a>
          </div>
        </footer>
      </div>
    </>
  )
}