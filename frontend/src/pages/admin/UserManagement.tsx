import { useState } from 'react'
import { KeyRound, Plus, Search, UserPlus } from 'lucide-react'
import * as api from '../../services'
import { useAsync } from '../../hooks/useAsync'
import {
  Badge, Button, Card, Empty, ErrorNote, Field, Input, Modal, PageHeader, Select, Spinner,
} from '../../components/ui'
import { DataTable } from '../../components/cards'
import { fmtDate, statusLabel } from '../../utils/format'
import type { AdminUser } from '../../types'

export default function UserManagement() {
  const [q, setQ] = useState('')
  const [roleF, setRoleF] = useState('')
  const { data, status, error, reload } = useAsync(
    () => api.fetchAdminUsers(q, roleF), true, [q, roleF])
  const units = useAsync(() => api.fetchUnitStats(), true)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ personnel_id: '', full_name: '', role: 'personnel', unit_id: '' })
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [rowBusy, setRowBusy] = useState<number | null>(null)

  const create = async () => {
    setBusy(true); setFlash(null)
    try {
      await api.createAdminUser({
        personnel_id: form.personnel_id, full_name: form.full_name, role: form.role,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
      })
      setOpen(false)
      setForm({ personnel_id: '', full_name: '', role: 'personnel', unit_id: '' })
      setFlash('Account created with default demo password.')
      await reload()
    } catch (e) { setFlash(e instanceof Error ? e.message : 'Create failed.') }
    finally { setBusy(false) }
  }

  const toggleActive = async (u: AdminUser) => {
    setRowBusy(u.id)
    try {
      await api.updateAdminUser(u.id, { active: !u.active })
      await reload()
    } finally { setRowBusy(null) }
  }

  const resetPw = async (u: AdminUser) => {
    setRowBusy(u.id)
    try {
      const res = await api.resetUserPassword(u.id)
      setFlash(res.message)
    } finally { setRowBusy(null) }
  }

  return (
    <>
      <PageHeader
        title="User management"
        subtitle="Create accounts, adjust roles and unit assignments. Every change is audit-logged."
        action={<Button onClick={() => setOpen(true)}><UserPlus size={15} /> Create account</Button>}
      />

      {flash && (
        <p className="mb-4 rounded-xl bg-sky-500/10 px-4 py-3 text-xs text-sky-200 ring-1 ring-sky-500/20">{flash}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ID…" className="pl-9" />
        </div>
        <div className="w-52"><Select value={roleF} onChange={setRoleF} options={[
          { value: '', label: 'All roles' },
          { value: 'personnel', label: 'Personnel' },
          { value: 'welfare_officer', label: 'Welfare officer' },
          { value: 'administrator', label: 'Administrator' },
        ]} /></div>
      </div>

      <Card className="mt-4" title={`${data?.items.length ?? 0} accounts`}>
        {status === 'loading' ? <Spinner /> : error ? <ErrorNote message={error} onRetry={reload} /> :
          !data!.items.length ? (
            <Empty icon={<Plus size={24} />} title="No accounts match your search" />
          ) : (
            <DataTable
              rows={data!.items}
              keyOf={(u) => u.id}
              columns={[
                {
                  header: 'Member',
                  cell: (u) => (
                    <div>
                      <p className="font-medium text-slate-200">{u.full_name}</p>
                      <code className="text-[11px] text-slate-500">{u.personnel_id}</code>
                    </div>
                  ),
                },
                {
                  header: 'Role',
                  cell: (u) => <Badge tone={u.role === 'administrator'
                    ? 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/40'
                    : u.role === 'welfare_officer'
                      ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40' : ''}>
                    {statusLabel(u.role)}
                  </Badge>,
                },
                { header: 'Unit', cell: (u) => u.unit ?? '—' },
                { header: 'Joined', cell: (u) => fmtDate(u.joining_date) },
                {
                  header: 'Status',
                  cell: (u) => (
                    <button disabled={rowBusy === u.id} onClick={() => toggleActive(u)}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                              u.active ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40 hover:bg-emerald-500/25'
                                       : 'bg-rose-500/15 text-rose-300 ring-rose-500/40 hover:bg-rose-500/25'}`}>
                      {u.active ? 'Active' : 'Deactivated'}
                    </button>
                  ),
                },
                {
                  header: '',
                  cell: (u) => (
                    <Button variant="ghost" size="sm" disabled={rowBusy === u.id} onClick={() => resetPw(u)}>
                      <KeyRound size={12} /> Reset pw
                    </Button>
                  ),
                },
              ]}
            />
          )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create user account">
        <div className="space-y-3.5">
          <Field label="Personnel ID" hint="e.g. CPF-1234 · must be unique">
            <Input value={form.personnel_id} onChange={(e) => setForm((f) => ({ ...f, personnel_id: e.target.value.toUpperCase() }))} />
          </Field>
          <Field label="Full name">
            <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={[
              { value: 'personnel', label: 'Personnel' },
              { value: 'welfare_officer', label: 'Welfare officer' },
              { value: 'administrator', label: 'Administrator' },
            ]} />
          </Field>
          <Field label="Unit assignment">
            <Select value={form.unit_id} onChange={(v) => setForm((f) => ({ ...f, unit_id: v }))}
                    options={[{ value: '', label: 'No unit (HQ staff)' },
                      ...(units.data?.units ?? []).map((u) => ({ value: String(u.id), label: u.name }))]} />
          </Field>
          <p className="text-[11px] leading-relaxed text-slate-500">New accounts start with password “demo1234” — the member should change it at first sign-in.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={create}>Create account</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
