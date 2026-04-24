import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
 
export default function LoginPage() {
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [remember, setRemember]   = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const { login }                 = useAuth()
  const navigate                  = useNavigate()
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      if (user.role === 'admin') {
        navigate('/dashboard')
      } else if (user.role === 'supervisor') {
        navigate('/supervisor')
      } else if (user.role === 'technician') {
        navigate('/technician')
      } else if (user.role === 'customer') {
        navigate('/customer')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }
 
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
 
        .login-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #f0f2f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 0;
        }
 
        /* Top nav bar */
        .login-nav {
          width: 100%;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border-bottom: 1px solid #e8ebe8;
        }
        .login-nav-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .login-nav-icon {
          width: 28px;
          height: 28px;
          background: #1a6b3c;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-nav-icon svg {
          width: 16px;
          height: 16px;
          fill: white;
        }
        .login-nav-name {
          font-family: 'DM Serif Display', serif;
          font-size: 17px;
          color: #1a2e1a;
          letter-spacing: -0.2px;
        }
 
        /* Main area */
        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 32px 16px;
        }
 
        /* Card */
        .login-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 40px 36px 36px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.08);
        }
 
        .login-title {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          color: #000a00;
          letter-spacing: -0.5px;
          margin: 0 0 6px;
        }
        .login-subtitle {
            font-family: 'DM Serif Display', serif;
          font-size: 13.5px;
          color: #7a8c7a;
          margin: 0 0 28px;
          font-weight: 400;
          line-height: 1.4;
        }
 
        /* Error */
        .login-error {
          background: #fff3f3;
          border: 1px solid #f5c6c6;
          color: #c0392b;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px;
          margin-bottom: 20px;
        }
 
        /* Field */
        .field-group {
          margin-bottom: 18px;
        }
        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #3d4f3d;
          margin-bottom: 7px;
          letter-spacing: 0.1px;
        }
        .field-wrap {
          position: relative;
        }
        .field-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #a0b0a0;
          display: flex;
          align-items: center;
        }
        .field-icon svg {
          width: 16px;
          height: 16px;
        }
        .field-input {
          width: 100%;
          box-sizing: border-box;
          background: #f7f9f7;
          border: 1.5px solid #e2e8e2;
          border-radius: 10px;
          padding: 12px 14px 12px 40px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #1a2e1a;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .field-input::placeholder {
          color: #b8c8b8;
        }
        .field-input:focus {
          border-color: #1a6b3c;
          box-shadow: 0 0 0 3px rgba(26,107,60,0.08);
          background: #fff;
        }
        .pass-toggle {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #a0b0a0;
          padding: 0;
          display: flex;
          align-items: center;
        }
        .pass-toggle svg {
          width: 17px;
          height: 17px;
        }
 
        /* Password row */
        .pass-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 7px;
        }
        .forgot-link {
          font-size: 12.5px;
          color: #1a6b3c;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.15s;
        }
        .forgot-link:hover { opacity: 0.75; }
 
        /* Remember me */
        .remember-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
          margin-top: 4px;
        }
        .remember-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #1a6b3c;
          cursor: pointer;
        }
        .remember-label {
          font-size: 13px;
          color: #5a6e5a;
          cursor: pointer;
          user-select: none;
        }
 
        /* Submit */
        .login-btn {
          width: 100%;
          background: #1a6b3c;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.18s, transform 0.12s;
        }
        .login-btn:hover:not(:disabled) {
          background: #155a32;
          transform: translateY(-1px);
        }
        .login-btn:disabled {
          background: #6aab85;
          cursor: not-allowed;
        }
        .login-btn svg {
          width: 17px;
          height: 17px;
        }
 
        /* Signup link */
        .signup-link-row {
          text-align: center;
          margin-top: 22px;
          font-size: 13.5px;
          color: #7a8c7a;
        }
        .signup-link-row a {
          color: #1a6b3c;
          font-weight: 600;
          text-decoration: none;
        }
        .signup-link-row a:hover { text-decoration: underline; }
 
        /* Footer */
        .login-footer {
          width: 100%;
          padding: 18px 28px;
          background: #fff;
          border-top: 1px solid #e8ebe8;
          text-align: center;
        }
        .login-footer-name {
          font-family: 'DM Serif Display', serif;
          font-size: 13px;
          color: #3d4f3d;
          margin-bottom: 3px;
        }
        .login-footer-copy {
          font-size: 11.5px;
          color: #a0b0a0;
          margin-bottom: 8px;
        }
        .login-footer-links {
          display: flex;
          justify-content: center;
          gap: 18px;
        }
        .login-footer-links a {
          font-size: 11.5px;
          color: #7a8c7a;
          text-decoration: none;
          transition: color 0.15s;
        }
        .login-footer-links a:hover { color: #1a6b3c; }
      `}</style>
 
      <div className="login-root">
        {/* Nav */}
        <nav className="login-nav">
          <div className="login-nav-logo">
            <div className="login-nav-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
            </div>
            <span className="login-nav-name">PestPro</span>
          </div>
        </nav>
 
        {/* Main */}
        <main className="login-main">
          <div className="login-card">
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to manage your eco-friendly protection plan.</p>
 
            {error && <div className="login-error">{error}</div>}
 
            <form onSubmit={handleSubmit}>
              {/* Email or Phone / Username */}
              <div className="field-group">
                <label 
  className="field-label"
  style={{ fontFamily: "'DM Serif Display', serif" }}
>
  Username
</label>
                <div className="field-wrap">
                  <span className="field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    className="field-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Enter your username"
                  />
                </div>
              </div>
 
              {/* Password */}
              <div className="field-group">
                <div className="pass-row">
                  <label 
  className="field-label" 
  style={{ marginBottom: 0, fontFamily: "'DM Serif Display', serif" }}
>
  Password
</label>
                  <a href="#" className="forgot-link" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Forgot Password?
                  </a>
                </div>
                <div className="field-wrap" style={{ marginTop: 7 }}>
                  <span className="field-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    className="field-input"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
 
              {/* Remember me */}
              <div className="remember-row">
                <input
                  type="checkbox"
                  id="remember"
                  className="remember-checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label htmlFor="remember" className="remember-label" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Remember me for 30 days
                </label>
              </div>
 
              <button type="submit" disabled={loading} className="login-btn" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {loading ? 'Signing in...' : (
                  <>
                    Login to PestPro
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
 
            <div className="signup-link-row" style={{ fontFamily: "'DM Serif Display', serif", marginTop: 22, textAlign: 'center' }}>
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </div>
          </div>
        </main>
 
        {/* Footer */}
        <footer className="login-footer">
          <div className="login-footer-name">PestPro</div>
          <div className="login-footer-copy" style={{ fontFamily: "'DM Serif Display', serif" }}>
            © 2026 PestPro Environmental Stewardship. Eco-Safe Certified.
          </div>
          <div className="login-footer-links">
            <a href="#" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Privacy Policy
            </a>
            <a href="#" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Terms of Service
            </a>
            <a href="#" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Help Center
            </a>
          </div>
        </footer>
      </div>
    </>
  )
}