import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/axios'

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1) // 1 = enter username, 2 = change password
  const [username, setUsername] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.'
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.'
    return ''
  }

  const handleVerify = (e) => {
    e.preventDefault()
    if (!username.trim()) { setError('Please enter your username.'); return }
    setError('')
    setStep(2)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')

    const pwdError = validatePassword(newPassword)
    if (pwdError) { setError(pwdError); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    if (newPassword === oldPassword) { setError('New password must be different from your current password.'); return }

    setLoading(true)
    try {
      await api.post('/auth/change-password/', {
        username,
        old_password: oldPassword,
        new_password: newPassword,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
  console.log('Full error:', err)
  console.log('Response status:', err.response?.status)
  console.log('Response data:', err.response?.data)
  const data = err.response?.data
  const msg = typeof data === 'object'
    ? Object.values(data).flat().join(' ')
    : data || 'Failed to reset password. Please check your credentials.'
  setError(msg)
} finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        .rp-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #f0f2f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }

        /* NAV */
        .rp-nav {
          width: 100%;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border-bottom: 1px solid #e8ebe8;
        }
        .rp-nav-logo { display: flex; align-items: center; gap: 8px; }
        .rp-nav-icon {
          width: 28px; height: 28px; background: #1a6b3c;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .rp-nav-icon svg { width: 16px; height: 16px; fill: white; }
        .rp-nav-name {
          font-family: 'DM Serif Display', serif;
          font-size: 17px; color: #1a2e1a; letter-spacing: -0.2px;
        }

        /* MAIN */
        .rp-main {
          flex: 1; display: flex; align-items: center;
          justify-content: center; width: 100%; padding: 32px 16px;
        }

        /* CARD */
        .rp-card {
          background: #fff; border-radius: 20px; padding: 40px 36px 36px;
          width: 100%; max-width: 380px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.08);
        }

        /* STEP INDICATOR */
        .rp-steps {
          display: flex; align-items: center; gap: 0;
          margin-bottom: 28px;
        }
        .rp-step {
          display: flex; flex-direction: column; align-items: center; flex: 1;
        }
        .rp-step-dot {
          width: 28px; height: 28px; border-radius: 50%;
          border: 2px solid #e2e8e2; background: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; color: #a0b0a0; font-family: 'DM Serif Display', serif;
          transition: all .2s;
        }
        .rp-step-dot.active {
          background: #1a6b3c; border-color: #1a6b3c; color: #fff;
        }
        .rp-step-dot.done {
          background: #1a6b3c; border-color: #1a6b3c; color: #fff;
        }
        .rp-step-label {
          font-size: 10px; color: #a0b0a0; margin-top: 5px;
          text-align: center; white-space: nowrap;
          font-family: 'DM Serif Display', serif;
        }
        .rp-step-label.active { color: #1a6b3c; }
        .rp-step-line {
          flex: 1; height: 2px; background: #e2e8e2;
          margin-bottom: 18px; transition: background .2s;
        }
        .rp-step-line.done { background: #1a6b3c; }

        .rp-title {
          font-family: 'DM Serif Display', serif;
          font-size: 26px; color: #000a00;
          letter-spacing: -0.5px; margin: 0 0 6px;
        }
        .rp-subtitle {
          font-family: 'DM Serif Display', serif;
          font-size: 13.5px; color: #7a8c7a;
          margin: 0 0 28px; line-height: 1.5;
        }

        /* ERROR */
        .rp-error {
          background: #fff3f3; border: 1px solid #f5c6c6;
          color: #c0392b; border-radius: 10px;
          padding: 11px 14px; font-size: 13px; margin-bottom: 20px;
        }

        /* SUCCESS */
        .rp-success {
          text-align: center; padding: 20px 0 10px;
        }
        .rp-success-icon {
          width: 60px; height: 60px; background: #edf6f1;
          border-radius: 50%; display: flex; align-items: center;
          justify-content: center; margin: 0 auto 16px;
        }
        .rp-success-icon svg { width: 28px; height: 28px; stroke: #1a6b3c; fill: none; stroke-width: 2; }
        .rp-success-title {
          font-family: 'DM Serif Display', serif;
          font-size: 20px; color: #1a2e1a; margin-bottom: 8px;
        }
        .rp-success-msg {
          font-family: 'DM Serif Display', serif;
          font-size: 13.5px; color: #7a8c7a; line-height: 1.5; margin-bottom: 20px;
        }

        /* FIELDS */
        .rp-field { margin-bottom: 18px; }
        .rp-label {
          display: block; font-size: 13px; font-weight: 500;
          color: #3d4f3d; margin-bottom: 7px;
          font-family: 'DM Serif Display', serif;
        }
        .rp-field-wrap { position: relative; }
        .rp-field-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%); color: #a0b0a0;
          display: flex; align-items: center;
        }
        .rp-field-icon svg { width: 16px; height: 16px; }
        .rp-input {
          width: 100%; box-sizing: border-box;
          background: #f7f9f7; border: 1.5px solid #e2e8e2;
          border-radius: 10px; padding: 12px 40px 12px 40px;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: #1a2e1a; outline: none;
          transition: border-color .18s, box-shadow .18s;
        }
        .rp-input::placeholder { color: #b8c8b8; }
        .rp-input:focus {
          border-color: #1a6b3c;
          box-shadow: 0 0 0 3px rgba(26,107,60,.08);
          background: #fff;
        }
        .rp-input.no-right-icon { padding-right: 14px; }
        .rp-toggle {
          position: absolute; right: 13px; top: 50%;
          transform: translateY(-50%); background: none;
          border: none; cursor: pointer; color: #a0b0a0;
          padding: 0; display: flex; align-items: center;
        }
        .rp-toggle svg { width: 17px; height: 17px; }

        /* PASSWORD STRENGTH */
        .rp-strength { margin-top: 8px; }
        .rp-strength-bar {
          height: 4px; border-radius: 2px; background: #e2e8e2;
          overflow: hidden; margin-bottom: 4px;
        }
        .rp-strength-fill {
          height: 100%; border-radius: 2px;
          transition: width .3s, background .3s;
        }
        .rp-strength-label {
          font-size: 11px; font-family: 'DM Serif Display', serif;
        }

        /* HINT */
        .rp-hint {
          font-size: 11.5px; color: #a0b0a0;
          margin-top: 6px; font-family: 'DM Serif Display', serif;
          line-height: 1.4;
        }

        /* DIVIDER */
        .rp-divider {
          border: none; border-top: 1px solid #e8ebe8;
          margin: 20px 0;
        }

        /* BUTTONS */
        .rp-btn {
          width: 100%; background: #1a6b3c; color: #fff;
          border: none; border-radius: 12px; padding: 14px;
          font-family: 'DM Serif Display', serif; font-size: 15px;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
          transition: background .18s, transform .12s;
        }
        .rp-btn:hover:not(:disabled) { background: #155a32; transform: translateY(-1px); }
        .rp-btn:disabled { background: #6aab85; cursor: not-allowed; }
        .rp-btn svg { width: 16px; height: 16px; }
        .rp-btn-secondary {
          width: 100%; background: #f0f2f0; color: #3d4f3d;
          border: 1.5px solid #e2e8e2; border-radius: 12px; padding: 13px;
          font-family: 'DM Serif Display', serif; font-size: 14px;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px; margin-top: 10px;
          transition: background .15s;
        }
        .rp-btn-secondary:hover { background: #e2e8e2; }
        .rp-btn-secondary svg { width: 14px; height: 14px; }

        /* BACK LINK */
        .rp-back-row {
          text-align: center; margin-top: 22px;
          font-size: 13.5px; color: #7a8c7a;
          font-family: 'DM Serif Display', serif;
        }
        .rp-back-row a { color: #1a6b3c; font-weight: 600; text-decoration: none; }
        .rp-back-row a:hover { text-decoration: underline; }

        /* FOOTER */
        .rp-footer {
          width: 100%; padding: 18px 28px;
          background: #fff; border-top: 1px solid #e8ebe8; text-align: center;
        }
        .rp-footer-name {
          font-family: 'DM Serif Display', serif;
          font-size: 13px; color: #3d4f3d; margin-bottom: 3px;
        }
        .rp-footer-copy {
          font-family: 'DM Serif Display', serif;
          font-size: 11.5px; color: #a0b0a0;
        }
      `}</style>

      <div className="rp-root">
        {/* NAV */}
        <nav className="rp-nav">
          <div className="rp-nav-logo">
            <div className="rp-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
            </div>
            <span className="rp-nav-name">PestPro</span>
          </div>
        </nav>

        {/* MAIN */}
        <main className="rp-main">
          <div className="rp-card">

            {/* STEP INDICATOR */}
            <div className="rp-steps">
              <div className="rp-step">
                <div className={`rp-step-dot ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`}>
                  {step > 1
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="14" height="14"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    : '1'}
                </div>
                <div className={`rp-step-label${step === 1 ? ' active' : ''}`}>Verify</div>
              </div>
              <div className={`rp-step-line${step > 1 ? ' done' : ''}`} style={{ marginBottom: 18 }} />
              <div className="rp-step">
                <div className={`rp-step-dot ${step === 2 ? 'active' : ''}`}>2</div>
                <div className={`rp-step-label${step === 2 ? ' active' : ''}`}>New Password</div>
              </div>
            </div>

            {/* SUCCESS STATE */}
            {success ? (
              <div className="rp-success">
                <div className="rp-success-icon">
                  <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div className="rp-success-title">Password Changed!</div>
                <div className="rp-success-msg">
                  Your password has been updated successfully.<br />
                  Redirecting you to login…
                </div>
                <button className="rp-btn" onClick={() => navigate('/login')}>
                  Go to Login
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                </button>
              </div>
            ) : step === 1 ? (
              /* STEP 1 — VERIFY USERNAME */
              <>
                <h1 className="rp-title">Reset Password</h1>
                <p className="rp-subtitle">Enter your username to get started. You'll need your current password on the next step.</p>

                {error && <div className="rp-error">{error}</div>}

                <form onSubmit={handleVerify}>
                  <div className="rp-field">
                    <label className="rp-label">Username</label>
                    <div className="rp-field-wrap">
                      <span className="rp-field-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </span>
                      <input
                        className={`rp-input rp-input--no-right`}
                        style={{ paddingRight: 14 }}
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setError('') }}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button type="submit" className="rp-btn">
                    Continue
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </form>

                <div className="rp-back-row">
                  Remember your password? <Link to="/login">Sign In</Link>
                </div>
              </>
            ) : (
              /* STEP 2 — CHANGE PASSWORD */
              <>
                <h1 className="rp-title">New Password</h1>
                <p className="rp-subtitle">Enter your current password and choose a new one for <strong style={{ color: '#1a2e1a' }}>{username}</strong>.</p>

                {error && <div className="rp-error">{error}</div>}

                <form onSubmit={handleReset}>
                  {/* Current Password */}
                  <div className="rp-field">
                    <label className="rp-label">Current Password</label>
                    <div className="rp-field-wrap">
                      <span className="rp-field-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      </span>
                      <input
                        className="rp-input"
                        type={showOld ? 'text' : 'password'}
                        placeholder="e.g. ChangeMe@123"
                        value={oldPassword}
                        onChange={e => { setOldPassword(e.target.value); setError('') }}
                      />
                      <button type="button" className="rp-toggle" onClick={() => setShowOld(v => !v)}>
                        {showOld
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                  </div>

                  <hr className="rp-divider" />

                  {/* New Password */}
                  <div className="rp-field">
                    <label className="rp-label">New Password</label>
                    <div className="rp-field-wrap">
                      <span className="rp-field-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      </span>
                      <input
                        className="rp-input"
                        type={showNew ? 'text' : 'password'}
                        placeholder="Min. 8 chars, 1 uppercase, 1 number"
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setError('') }}
                      />
                      <button type="button" className="rp-toggle" onClick={() => setShowNew(v => !v)}>
                        {showNew
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                    {/* Strength bar */}
                    {newPassword && <PasswordStrength password={newPassword} />}
                    <div className="rp-hint">Must be 8+ characters with at least one uppercase letter and one number.</div>
                  </div>

                  {/* Confirm Password */}
                  <div className="rp-field">
                    <label className="rp-label">Confirm New Password</label>
                    <div className="rp-field-wrap">
                      <span className="rp-field-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      </span>
                      <input
                        className="rp-input"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                      />
                      <button type="button" className="rp-toggle" onClick={() => setShowConfirm(v => !v)}>
                        {showConfirm
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <div style={{ fontSize: 11.5, color: '#e74c3c', marginTop: 6, fontFamily: "'DM Serif Display', serif" }}>
                        Passwords do not match.
                      </div>
                    )}
                    {confirmPassword && newPassword === confirmPassword && (
                      <div style={{ fontSize: 11.5, color: '#1a6b3c', marginTop: 6, fontFamily: "'DM Serif Display', serif" }}>
                        ✓ Passwords match.
                      </div>
                    )}
                  </div>

                  <button type="submit" className="rp-btn" disabled={loading}>
                    {loading ? 'Updating…' : (
                      <>
                        Update Password
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </>
                    )}
                  </button>

                  <button type="button" className="rp-btn-secondary" onClick={() => { setStep(1); setError(''); setOldPassword(''); setNewPassword(''); setConfirmPassword('') }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                    Back
                  </button>
                </form>
              </>
            )}
          </div>
        </main>

        {/* FOOTER */}
        <footer className="rp-footer">
          <div className="rp-footer-name">PestPro</div>
          <div className="rp-footer-copy">© 2026 PestPro Environmental Stewardship. Eco-Safe Certified.</div>
        </footer>
      </div>
    </>
  )
}

/* PASSWORD STRENGTH INDICATOR */
function PasswordStrength({ password }) {
  const getStrength = (pwd) => {
    let score = 0
    if (pwd.length >= 8)  score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const score = getStrength(password)
  const width = `${(score / 5) * 100}%`
  const color = score <= 1 ? '#e74c3c' : score <= 2 ? '#e6a817' : score <= 3 ? '#3b82f6' : '#1a6b3c'
  const label = score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score <= 3 ? 'Good' : score === 4 ? 'Strong' : 'Very Strong'

  return (
    <div className="rp-strength">
      <div className="rp-strength-bar">
        <div className="rp-strength-fill" style={{ width, background: color }} />
      </div>
      <div className="rp-strength-label" style={{ color }}>{label}</div>
    </div>
  )
}