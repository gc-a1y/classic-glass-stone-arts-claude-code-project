import { useState, useEffect } from 'react'
import { Save, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface Settings {
  business_name: string
  business_address: string
  business_phone: string
  business_email: string
  tax_rate: string
  check_instructions: string
  bella_enabled: string
  sendgrid_from_email: string
}

const DEFAULTS: Settings = {
  business_name: 'Classic Glass & Stone Arts',
  business_address: '',
  business_phone: '',
  business_email: '',
  tax_rate: '6',
  check_instructions: 'Please make check payable to Classic Glass & Stone Arts and mail to the address above. Include your invoice number in the memo line.',
  bella_enabled: 'true',
  sendgrid_from_email: '',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stripeStatus, setStripeStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  useEffect(() => {
    supabase.from('settings').select('key, value')
      .then(({ data }) => {
        if (data) {
          const s = { ...DEFAULTS }
          data.forEach(row => {
            if (row.key in s) (s as any)[row.key] = row.value
          })
          setSettings(s)
        }
        setLoading(false)
      })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const upserts = Object.entries(settings).map(([key, value]) => ({
        key, value, updated_at: new Date().toISOString()
      }))
      const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' })
      if (error) throw error
      toast.success('Settings saved!')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, [key]: e.target.value }))
  }

  if (loading) return (
    <div className="space-y-6">
      {[1,2,3].map(i => <div key={i} className="card h-32 skeleton" />)}
    </div>
  )

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-text-muted text-sm mt-0.5">Configure your business portal</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      {/* Business Info */}
      <div className="card space-y-4">
        <h2 className="section-title">Business Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Business Name</label>
            <input className="input" value={settings.business_name} onChange={set('business_name')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" placeholder="(703) 555-0100" value={settings.business_phone} onChange={set('business_phone')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="info@classicglassstone.com" value={settings.business_email} onChange={set('business_email')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Business Address</label>
            <textarea className="input resize-none" rows={2} placeholder="123 Main St, Suite 100, Arlington, VA 22201" value={settings.business_address} onChange={set('business_address')} />
          </div>
        </div>
      </div>

      {/* Tax */}
      <div className="card space-y-4">
        <h2 className="section-title">Tax Configuration</h2>
        <div className="max-w-xs">
          <label className="label">Default Tax Rate (%)</label>
          <input type="number" min="0" max="100" step="0.1" className="input" value={settings.tax_rate} onChange={set('tax_rate')} />
          <p className="text-xs text-text-muted mt-1">Applied by default on all new estimates and invoices</p>
        </div>
      </div>

      {/* Stripe */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Stripe Connect</h2>
          <span className={`badge ${stripeStatus === 'connected' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
            {stripeStatus === 'checking' ? '...' : stripeStatus === 'connected' ? '✓ Connected' : '○ Not Connected'}
          </span>
        </div>
        <p className="text-sm text-text-muted">Configure Stripe via the <code className="text-gold bg-surface-2 px-1 rounded text-xs">STRIPE_SECRET_KEY</code> environment variable in your backend <code className="text-gold bg-surface-2 px-1 rounded text-xs">.env</code> file.</p>
        <div className="bg-surface-2 border border-border rounded-input p-3 text-xs font-mono text-text-muted">
          <p>STRIPE_SECRET_KEY=sk_live_...</p>
          <p>VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...</p>
        </div>
        <p className="text-xs text-text-muted">ACH (0.8%, capped $5.00) and Card (2.9% + $0.30) payments are handled automatically. Card surcharge is passed to the client.</p>
      </div>

      {/* SendGrid */}
      <div className="card space-y-4">
        <h2 className="section-title">SendGrid Email</h2>
        <div>
          <label className="label">From Email</label>
          <input type="email" className="input" placeholder="invoices@classicglassstone.com" value={settings.sendgrid_from_email} onChange={set('sendgrid_from_email')} />
        </div>
        <p className="text-sm text-text-muted">Set <code className="text-gold bg-surface-2 px-1 rounded text-xs">SENDGRID_API_KEY</code> in your backend <code className="text-gold bg-surface-2 px-1 rounded text-xs">.env</code> file.</p>
      </div>

      {/* Bella AI */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Bella AI Receptionist</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`w-10 h-6 rounded-full transition-colors ${settings.bella_enabled === 'true' ? 'bg-gold' : 'bg-surface-2'} relative`}
              onClick={() => setSettings(prev => ({ ...prev, bella_enabled: prev.bella_enabled === 'true' ? 'false' : 'true' }))}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.bella_enabled === 'true' ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-text">{settings.bella_enabled === 'true' ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>
        <p className="text-sm text-text-muted">The Bella AI chat widget appears on all pages of your portal. Powered by Claude (claude-sonnet-4-20250514).</p>
        <p className="text-sm text-text-muted">Set <code className="text-gold bg-surface-2 px-1 rounded text-xs">ANTHROPIC_API_KEY</code> in your backend <code className="text-gold bg-surface-2 px-1 rounded text-xs">.env</code> file.</p>
      </div>

      {/* Check Instructions */}
      <div className="card space-y-4">
        <h2 className="section-title">Check Payment Instructions</h2>
        <p className="text-sm text-text-muted">This text is shown to clients who select "Pay by Check" on the payment page.</p>
        <textarea
          className="input resize-none"
          rows={4}
          value={settings.check_instructions}
          onChange={set('check_instructions')}
          placeholder="Provide mailing instructions for check payments..."
        />
      </div>
    </div>
  )
}
