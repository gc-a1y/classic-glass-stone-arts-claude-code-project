import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users, Upload, X } from 'lucide-react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { Client } from '../types'
import { formatDate } from '../lib/utils'
import { SkeletonTable } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

const EMPTY_CLIENT: Omit<Client, 'id' | 'created_at'> = {
  name: '', email: '', phone: '', address: ''
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_CLIENT)
  const [saving, setSaving] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)

  const load = () => {
    supabase.from('clients').select('*').eq('archived', false).order('name')
      .then(({ data }) => { setClients((data || []) as Client[]); setLoading(false) })
  }

  useEffect(load, [])

  const filtered = clients.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const openAdd = () => { setForm(EMPTY_CLIENT); setEditClient(null); setAddModal(true) }
  const openEdit = (c: Client) => { setForm({ name: c.name, email: c.email, phone: c.phone, address: c.address }); setEditClient(c); setAddModal(true) }

  const saveClient = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      if (editClient) {
        const { error } = await supabase.from('clients').update(form).eq('id', editClient.id)
        if (error) throw error
        toast.success('Client updated!')
      } else {
        const { error } = await supabase.from('clients').insert({ ...form, created_at: new Date().toISOString() })
        if (error) throw error
        toast.success('Client added!')
      }
      setAddModal(false)
      setLoading(true)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save client')
    } finally {
      setSaving(false)
    }
  }

  const archiveClient = async (id: string) => {
    if (!confirm('Archive this client? They will be hidden from lists.')) return
    await supabase.from('clients').update({ archived: true }).eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
    toast.success('Client archived')
  }

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const rows = (data as any[]).map(row => ({
          name: row.name || row.Name || '',
          email: row.email || row.Email || '',
          phone: row.phone || row.Phone || '',
          address: row.address || row.Address || '',
          created_at: new Date().toISOString(),
        })).filter(r => r.name)
        if (!rows.length) { toast.error('No valid rows found in CSV'); return }
        const { error } = await supabase.from('clients').insert(rows)
        if (error) { toast.error('CSV import failed: ' + error.message); return }
        toast.success(`Imported ${rows.length} clients!`)
        load()
      },
    })
    e.target.value = ''
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="text-text-muted text-sm mt-0.5">{clients.length} active clients</p>
        </div>
        <div className="flex gap-2">
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <button onClick={() => csvRef.current?.click()} className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Client
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input className="input pl-9 max-w-md" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6"><SkeletonTable /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No clients yet" description="Add your first client or import from CSV." action={{ label: 'Add Client', onClick: openAdd }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">Address</th>
                  <th className="table-header">Added</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="table-cell">
                      <Link to={`/clients/${c.id}`} className="font-medium hover:text-gold transition-colors">{c.name}</Link>
                    </td>
                    <td className="table-cell text-text-muted">{c.email || '—'}</td>
                    <td className="table-cell text-text-muted">{c.phone || '—'}</td>
                    <td className="table-cell text-text-muted text-xs max-w-[180px] truncate">{c.address || '—'}</td>
                    <td className="table-cell text-text-muted">{formatDate(c.created_at)}</td>
                    <td className="table-cell">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(c)} className="text-xs text-gold hover:text-gold-light font-medium">Edit</button>
                        <button onClick={() => archiveClient(c.id)} className="text-xs text-text-muted hover:text-red-400">Archive</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title={editClient ? 'Edit Client' : 'Add Client'} size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="jane@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" className="input" placeholder="(703) 555-0100" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input resize-none" rows={2} placeholder="123 Main St, Arlington, VA 22201" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setAddModal(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={saveClient} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> : null}
              {editClient ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
