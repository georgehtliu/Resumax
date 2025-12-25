import { supabase } from './config/supabase'
import { useEffect, useState } from 'react'

export default function TestSupabase() {
  const [status, setStatus] = useState('Testing connection...')

  useEffect(() => {
    async function test() {
      try {
        // Try to query profiles table (should be empty, that's fine)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(1)
        
        if (error) {
          setStatus(`❌ Error: ${error.message}`)
        } else {
          setStatus('✅ Connected! Supabase is working.')
        }
      } catch (err) {
        setStatus(`❌ Failed: ${err.message}`)
      }
    }
    test()
  }, [])

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      borderRadius: '8px',
      margin: '20px',
      border: '1px solid #ddd'
    }}>
      <h3 style={{ marginTop: 0 }}>Supabase Connection Test</h3>
      <p style={{ margin: 0, fontWeight: 'bold' }}>{status}</p>
    </div>
  )
}

