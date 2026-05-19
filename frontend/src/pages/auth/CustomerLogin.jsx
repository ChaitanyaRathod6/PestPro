import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/axios'

export default function CustomerLogin() {
  const [step, setStep]       = useState('email') // 'email' | 'otp'
  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const navigate              = useNavigate()

  const handleRequestOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/customer/request-otp/', { email })
      setSent(true)
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/customer/verify-otp/', { email, otp_code: otp })
      // Store customer session data
      localStorage.setItem('customer', JSON.stringify(res.data.customer))
      navigate('/customer')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/customer/request-otp/', { email })
      setOtp('')
      setSent(true)
    } catch (err) {
      setError('Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        .cl-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #f0f2f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }

        /* Nav */
        .cl-nav {
          width: 100%;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border-bottom: 1px solid #e8ebe8;
        }
        .cl-nav-logo { display: flex; align-items: center; gap: 8px; }
        .cl-nav-icon {
          width: 28px; height: 28px; background: #1a6b3c;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .cl-nav-icon svg { width: 16px; height: 16px; fill: white; }
        .cl-nav-name {
          font-family: 'DM Serif Display', serif;
          font-size: 17px; color: #1a2e1a; letter-spacing: -0.2px;
        }

        /* Main */
        .cl-main {
          flex: 1; display: flex; align-items: center;
          justify-content: center; width: 100%; padding: 32px 16px;
        }

        /* Card */
        .cl-card {
          background: #fff; border-radius: 20px; padding: 40px 36px 36px;
          width: 100%; max-width: 360px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.08);
        }

        .cl-title {
          font-family: 'DM Serif Display', serif;
          font-size: 28px; color: #000a00; letter-spacing: -0.5px; margin: 0 0 6px;
        }
        .cl-subtitle {
          font-family: 'DM Serif Display', serif;
          font-size: 13.5px; color: #7a8c7a; margin: 0 0 28px;
          font-weight: 400; line-height: 1.4;
        }

        /* Step indicator */
        .cl-steps {
          display: flex; align-items: center; gap: 0; margin-bottom: 28px;
        }
        .cl-step {
          display: flex; align-items: center; gap: 6px; font-size: 12px;
          font-family: 'DM Serif Display', serif;
        }
        .cl-step-dot {
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600; flex-shrink: 0;
        }
        .cl-step-dot.done { background: #1a6b3c; color: #fff; }
        .cl-step-dot.active { background: #1a6b3c; color: #fff; }
        .cl-step-dot.pending { background: #e8ebe8; color: #a0b0a0; }
        .cl-step-label.active { color: #1a2e1a; }
        .cl-step-label.pending { color: #a0b0a0; }
        .cl-step-line {
          flex: 1; height: 1.5px; background: #e8ebe8; margin: 0 8px;
        }
        .cl-step-line.done { background: #1a6b3c; }

        /* Error */
        .cl-error {
          background: #fff3f3; border: 1px solid #f5c6c6; color: #c0392b;
          border-radius: 10px; padding: 11px 14px; font-size: 13px; margin-bottom: 20px;
        }

        /* Success banner */
        .cl-success {
          background: #edf6f1; border: 1px solid #b8ddc9; color: #1a6b3c;
          border-radius: 10px; padding: 11px 14px; font-size: 13px;
          margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
          font-family: 'DM Serif Display', serif;
        }

        /* Field */
        .cl-field { margin-bottom: 18px; }
        .cl-label {
          display: block; font-size: 13px; font-weight: 500; color: #3d4f3d;
          margin-bottom: 7px; letter-spacing: 0.1px;
          font-family: 'DM Serif Display', serif;
        }
        .cl-wrap { position: relative; }
        .cl-icon {
          position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
          color: #a0b0a0; display: flex; align-items: center;
        }
        .cl-icon svg { width: 16px; height: 16px; }
        .cl-input {
          width: 100%; box-sizing: border-box; background: #f7f9f7;
          border: 1.5px solid #e2e8e2; border-radius: 10px;
          padding: 12px 14px 12px 40px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a2e1a;
          outline: none; transition: border-color 0.18s, box-shadow 0.18s;
        }
        .cl-input::placeholder { color: #b8c8b8; }
        .cl-input:focus {
          border-color: #1a6b3c; box-shadow: 0 0 0 3px rgba(26,107,60,0.08);
          background: #fff;
        }

        /* OTP input special */
        .cl-otp-input {
          width: 100%; box-sizing: border-box; background: #f7f9f7;
          border: 1.5px solid #e2e8e2; border-radius: 10px;
          padding: 14px 14px 14px 40px;
          font-family: 'DM Serif Display', serif; font-size: 22px;
          color: #1a2e1a; letter-spacing: 8px; text-align: center;
          outline: none; transition: border-color 0.18s, box-shadow 0.18s;
        }
        .cl-otp-input::placeholder { color: #b8c8b8; letter-spacing: 4px; font-size: 14px; }
        .cl-otp-input:focus {
          border-color: #1a6b3c; box-shadow: 0 0 0 3px rgba(26,107,60,0.08);
          background: #fff;
        }

        /* Hint */
        .cl-hint {
          font-size: 12px; color: #a0b0a0; margin-top: 6px;
          font-family: 'DM Serif Display', serif;
        }

        /* Button */
        .cl-btn {
          width: 100%; background: #1a6b3c; color: #fff; border: none;
          border-radius: 12px; padding: 14px;
          font-family: 'DM Serif Display', serif; font-size: 15px; font-weight: 600;
          cursor: pointer; letter-spacing: 0.2px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.18s, transform 0.12s;
        }
        .cl-btn:hover:not(:disabled) { background: #155a32; transform: translateY(-1px); }
        .cl-btn:disabled { background: #6aab85; cursor: not-allowed; }
        .cl-btn svg { width: 17px; height: 17px; }

        /* Resend row */
        .cl-resend-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 16px;
        }
        .cl-back-btn {
          background: none; border: none; cursor: pointer; color: #7a8c7a;
          font-family: 'DM Serif Display', serif; font-size: 13px;
          display: flex; align-items: center; gap: 4px; padding: 0;
          transition: color 0.15s;
        }
        .cl-back-btn:hover { color: #1a6b3c; }
        .cl-resend-btn {
          background: none; border: none; cursor: pointer; color: #1a6b3c;
          font-family: 'DM Serif Display', serif; font-size: 13px; font-weight: 600;
          padding: 0; transition: opacity 0.15s;
        }
        .cl-resend-btn:hover { opacity: 0.75; }
        .cl-resend-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Staff login link */
        .cl-staff-row {
          text-align: center; margin-top: 22px; font-size: 13.5px; color: #7a8c7a;
          font-family: 'DM Serif Display', serif;
        }
        .cl-staff-row a { color: #1a6b3c; font-weight: 600; text-decoration: none; }
        .cl-staff-row a:hover { text-decoration: underline; }

        /* Footer */
        .cl-footer {
          width: 100%; padding: 18px 28px; background: #fff;
          border-top: 1px solid #e8ebe8; text-align: center;
        }
        .cl-footer-name {
          font-family: 'DM Serif Display', serif; font-size: 13px; color: #3d4f3d; margin-bottom: 3px;
        }
        .cl-footer-copy {
          font-family: 'DM Serif Display', serif;
          font-size: 11.5px; color: #a0b0a0; margin-bottom: 8px;
        }
        .cl-footer-links { display: flex; justify-content: center; gap: 18px; }
        .cl-footer-links a {
          font-family: 'DM Serif Display', serif;
          font-size: 11.5px; color: #7a8c7a; text-decoration: none; transition: color 0.15s;
        }
        .cl-footer-links a:hover { color: #1a6b3c; }
      `}</style>

      <div className="cl-root">
        {/* Nav */}
        <nav className="cl-nav">
          <div className="cl-nav-logo">
            <div className="cl-nav-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
              </svg>
            </div>
            <span className="cl-nav-name">PestPro</span>
          </div>
        </nav>

        {/* Main */}
        <main className="cl-main">
          <div className="cl-card">

            <h1 className="cl-title">
              {step === 'email' ? 'Customer Portal' : 'Enter Your Code'}
            </h1>
            <p className="cl-subtitle">
              {step === 'email'
                ? 'Enter your registered email to receive a one-time login code.'
                : `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
            </p>

            {/* Step indicator */}
            <div className="cl-steps">
              <div className="cl-step">
                <div className={`cl-step-dot ${step === 'otp' ? 'done' : 'active'}`}>
                  {step === 'otp'
                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    : '1'}
                </div>
                <span className="cl-step-label active">Email</span>
              </div>
              <div className={`cl-step-line ${step === 'otp' ? 'done' : ''}`}/>
              <div className="cl-step">
                <div className={`cl-step-dot ${step === 'otp' ? 'active' : 'pending'}`}>2</div>
                <span className={`cl-step-label ${step === 'otp' ? 'active' : 'pending'}`}>Verify</span>
              </div>
            </div>

            {error && <div className="cl-error">{error}</div>}

            {step === 'email' ? (
              /* ── STEP 1: Email ── */
              <form onSubmit={handleRequestOTP}>
                <div className="cl-field">
                  <label className="cl-label">Email Address</label>
                  <div className="cl-wrap">
                    <span className="cl-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                    <input
                      className="cl-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      autoFocus
                    />
                  </div>
                  <div className="cl-hint">We'll send a one-time code — no password needed.</div>
                </div>

                <button type="submit" className="cl-btn" disabled={loading}>
                  {loading ? 'Sending Code…' : (
                    <>
                      Send Login Code
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </>
                  )}
                </button>

                <div className="cl-staff-row">
                  Staff member? <Link to="/login">Sign in here</Link>
                </div>
              </form>

            ) : (
              /* ── STEP 2: OTP ── */
              <form onSubmit={handleVerifyOTP}>
                {sent && (
                  <div className="cl-success">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a6b3c" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    Code sent to {email}
                  </div>
                )}

                <div className="cl-field">
                  <label className="cl-label">6-Digit Code</label>
                  <div className="cl-wrap">
                    <input
                      className="cl-otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      placeholder="······"
                      autoFocus
                    />
                  </div>
                  <div className="cl-hint">Enter the 6-digit code from your email.</div>
                </div>

                <button type="submit" className="cl-btn" disabled={loading || otp.length < 6}>
                  {loading ? 'Verifying…' : (
                    <>
                      Verify & Sign In
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                        <polyline points="10 17 15 12 10 7"/>
                        <line x1="15" y1="12" x2="3" y2="12"/>
                      </svg>
                    </>
                  )}
                </button>

                <div className="cl-resend-row">
                  <button type="button" className="cl-back-btn" onClick={() => { setStep('email'); setError(''); setOtp('') }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Change email
                  </button>
                  <button type="button" className="cl-resend-btn" onClick={handleResend} disabled={loading}>
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="cl-footer">
          <div className="cl-footer-name">PestPro</div>
          <div className="cl-footer-copy">© 2026 PestPro Environmental Stewardship. Eco-Safe Certified.</div>
          <div className="cl-footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Help Center</a>
          </div>
        </footer>
      </div>
    </>
  )
}
