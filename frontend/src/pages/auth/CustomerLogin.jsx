import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

export default function CustomerLogin(){
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState(0) // 0=request,1=verify
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setAuthUser } = useAuth()

  const requestOtp = async (e) => {
    e?.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await api.post('/auth/customer/request-otp/', { email })
      setMessage('If this email is registered, a code was sent. Enter the code below.')
      setStage(1)
    } catch (err) {
      setError('Unable to request code. Try again.')
    } finally { setLoading(false) }
  }

  const verifyOtp = async (e) => {
    e?.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const resp = await api.post('/auth/customer/verify-otp/', { email, otp_code: otp })
      const customer = resp.data.customer
      // create a lightweight user object so ProtectedRoute accepts customer
      const userObj = {
        id: customer.id,
        username: customer.email,
        email: customer.email,
        role: 'customer',
        name: customer.name
      }
      setAuthUser(userObj)
      navigate('/customer')
    } catch (err) {
      setError(err.response?.data?.otp_code || 'Invalid code. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f2f0'}}>
      <div style={{width:360,background:'#fff',padding:28,borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,0.08)'}}>
        <h2 style={{margin:0,marginBottom:8,fontFamily:'DM Serif Display, serif'}}>Customer login</h2>
        <p style={{margin:0,marginBottom:14,color:'#6b776b'}}>Sign in with a one-time code sent to your email.</p>

        {error && <div style={{background:'#fff3f3',padding:10,borderRadius:8,color:'#c0392b',marginBottom:10}}>{error}</div>}
        {message && <div style={{background:'#eef8f0',padding:10,borderRadius:8,color:'#1a6b3c',marginBottom:10}}>{message}</div>}

        {stage === 0 ? (
          <form onSubmit={requestOtp}>
            <label style={{fontSize:13,color:'#3d4f3d'}}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #e2e8e2',marginTop:8,marginBottom:12}} />
            <button type="submit" disabled={loading} style={{width:'100%',padding:12,borderRadius:10,background:'#1a6b3c',color:'#fff',border:'none'}}>Request code</button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <label style={{fontSize:13,color:'#3d4f3d'}}>Enter code</label>
            <input value={otp} onChange={e=>setOtp(e.target.value)} required placeholder="6-digit code" style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #e2e8e2',marginTop:8,marginBottom:12}} />
            <div style={{display:'flex',gap:8}}>
              <button type="button" onClick={()=>setStage(0)} style={{flex:1,padding:10,borderRadius:10,border:'1px solid #e2e8e2',background:'#fff'}}>Back</button>
              <button type="submit" disabled={loading} style={{flex:1,padding:10,borderRadius:10,background:'#1a6b3c',color:'#fff',border:'none'}}>Verify & Sign in</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
