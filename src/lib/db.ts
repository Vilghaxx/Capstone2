import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import path from 'path'

const KEY_PATH =
  process.env.FIREBASE_KEY_PATH ??
  path.join(process.cwd(), 'capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json')

const DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ??
  'https://capstone-f6c32-default-rtdb.firebaseio.com'

if (!getApps().length) {
  try {
    const sa = JSON.parse(readFileSync(KEY_PATH, 'utf-8'))
    initializeApp({ credential: cert(sa), databaseURL: DATABASE_URL })
    console.log('[firebase] Admin SDK initialized (RTDB)')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[firebase] Init failed: ${msg}`)
    console.error(`[firebase] Check key at: ${KEY_PATH}`)
  }
}

const rtdb = getDatabase()

type Doc = Record<string, unknown>
type Where = Record<string, unknown>
type Order = Record<string, 'asc' | 'desc'> | Array<{ field: string; direction: 'asc' | 'desc' }>

function now() {
  return new Date().toISOString()
}

function docData<T>(snap: any): T | null {
  if (!snap.exists()) return null
  const val = snap.val()
  if (typeof val !== 'object' || val === null) return { id: snap.key, value: val } as T
  return { id: snap.key, ...val } as T
}

function allDocData<T>(snap: any): T[] {
  if (!snap.exists()) return []
  const results: T[] = []
  snap.forEach((child: any) => {
    results.push(docData<T>(child))
  })
  return results
}

function toPrimitive(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString()
  return v
}

function deepToPrimitive(data: Doc): Doc {
  const out: Doc = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id') continue
    if (v instanceof Date) { out[k] = v.toISOString(); continue }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested: Record<string, unknown> = {}
      for (const [nk, nv] of Object.entries(v as Doc)) {
        nested[nk] = toPrimitive(nv)
      }
      out[k] = nested
    } else {
      out[k] = v
    }
  }
  return out
}

function collection(name: string) {
  const collRef = () => rtdb.ref(name)

  async function findUnique({ where }: { where: Where }) {
    const keys = Object.keys(where)
    if (keys.length === 1 && keys[0] === 'id') {
      const snap = await collRef().child(String(where.id)).once('value')
      return docData<any>(snap)
    }

    if (keys.length === 1 && keys[0].includes('_')) {
      const v = where[keys[0]] as Doc
      const entries = Object.entries(v)
      const snap = await collRef().orderByChild(entries[0][0]).equalTo(toPrimitive(entries[0][1])).once('value')
      const docs = allDocData<any>(snap)
      if (docs.length === 0) return null
      if (entries.length === 1) return docs[0]
      return docs.find(d => entries.slice(1).every(([k, kv]) => d[k] === toPrimitive(kv))) ?? null
    }

    if (keys.length === 1) {
      const [field, value] = Object.entries(where)[0]
      const snap = await collRef().orderByChild(field).equalTo(toPrimitive(value)).limitToFirst(1).once('value')
      if (!snap.exists()) return null
      const val = snap.val()
      const childKey = Object.keys(val)[0]
      return { id: childKey, ...val[childKey] } as any
    }

    const entries = Object.entries(where)
    const [firstField, firstVal] = entries[0]
    const snap = await collRef().orderByChild(firstField).equalTo(toPrimitive(firstVal)).once('value')
    const docs = allDocData<any>(snap)
    return docs.find(d => entries.slice(1).every(([k, kv]) => d[k] === toPrimitive(kv))) ?? null
  }

  async function findMany({
    where,
    orderBy,
    skip,
    take,
    select,
  }: { where?: Where; orderBy?: Order; skip?: number; take?: number; select?: Record<string, true> } = {}) {
    const eqFields: Record<string, unknown> = {}
    const opFields: Record<string, Record<string, unknown>> = {}
    const containsFilters: Array<{ key: string; val: string }> = []
    let inFilter: { key: string; vals: unknown[] } | null = null

    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (k.includes('_') && v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) {
            eqFields[nk] = nv
          }
          continue
        }
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          const obj = v as Record<string, unknown>
          if ('contains' in obj) { containsFilters.push({ key: k, val: obj.contains as string }); continue }
          if ('in' in obj && Array.isArray(obj.in)) { inFilter = { key: k, vals: obj.in }; continue }
          if ('gte' in obj || 'gt' in obj || 'lte' in obj || 'lt' in obj) {
            opFields[k] = obj as Record<string, unknown>
            continue
          }
        }
        eqFields[k] = v
      }
    }

    let docs: any[]

    if (inFilter && inFilter.key === 'id' && Object.keys(eqFields).length === 0 && Object.keys(opFields).length === 0 && containsFilters.length === 0) {
      const results: any[] = []
      for (const id of inFilter.vals) {
        const snap = await collRef().child(String(id)).once('value')
        if (snap.exists()) results.push({ id: snap.key!, ...snap.val() })
      }
      docs = results
    } else if (Object.keys(eqFields).length > 0) {
      const eqEntries = Object.entries(eqFields)
      const [field, value] = eqEntries[0]
      const snap = await collRef().orderByChild(field).equalTo(toPrimitive(value)).once('value')
      docs = allDocData<any>(snap)
      for (let i = 1; i < eqEntries.length; i++) {
        const [k, v] = eqEntries[i]
        const pv = toPrimitive(v)
        docs = docs.filter(d => d[k] === pv)
      }
    } else {
      const snap = await collRef().once('value')
      docs = allDocData<any>(snap)
    }

    for (const [k, obj] of Object.entries(opFields)) {
      if ('gte' in obj) {
        const val = toPrimitive(obj.gte) as string
        docs = docs.filter(d => d[k] >= val)
      }
      if ('gt' in obj) {
        const val = toPrimitive(obj.gt) as string
        docs = docs.filter(d => d[k] > val)
      }
      if ('lte' in obj) {
        const val = toPrimitive(obj.lte) as string
        docs = docs.filter(d => d[k] <= val)
      }
      if ('lt' in obj) {
        const val = toPrimitive(obj.lt) as string
        docs = docs.filter(d => d[k] < val)
      }
    }

    if (inFilter) {
      docs = docs.filter(d => inFilter!.vals.includes(d[inFilter!.key]))
    }

    for (const { key, val } of containsFilters) {
      const search = val.toLowerCase()
      docs = docs.filter(d => String(d[key] ?? '').toLowerCase().includes(search))
    }

    if (orderBy) {
      const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
      for (const o of orders) {
        const [field, dir] = Object.entries(o)[0]
        if (dir === 'asc') {
          docs.sort((a, b) => a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0)
        } else {
          docs.sort((a, b) => a[field] > b[field] ? -1 : a[field] < b[field] ? 1 : 0)
        }
      }
    }

    if (skip) docs = docs.slice(skip)
    if (take) docs = docs.slice(0, take)

    if (select) {
      const keys = Object.keys(select)
      docs = docs.map((r: any) => {
        const out: Record<string, unknown> = {}
        for (const k of keys) out[k] = r[k]
        return out
      })
    }

    return docs
  }

  async function create({ data }: { data: Doc }) {
    const docRef = collRef().push()
    const id = docRef.key!
    const saved: Doc = { ...deepToPrimitive(data), id, createdAt: now(), updatedAt: now() }
    await docRef.set(saved)
    return { ...saved } as any
  }

  async function update({ where, data }: { where: Where; data: Doc }) {
    const existing = await findUnique({ where })
    if (!existing) throw new Error('Record not found')
    const id = existing.id
    const upd: Doc = {}
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'id') upd[k] = toPrimitive(v)
    }
    upd.updatedAt = now()
    await collRef().child(id).update(upd)
    const snap = await collRef().child(id).once('value')
    return docData<any>(snap)!
  }

  async function remove({ where }: { where: Where }) {
    const existing = await findUnique({ where })
    if (!existing) throw new Error('Record not found')
    await collRef().child(existing.id).remove()
  }

  async function count({ where }: { where?: Where } = {}) {
    if (!where || Object.keys(where).length === 0) {
      const snap = await collRef().once('value')
      return snap.exists() ? Object.keys(snap.val()).length : 0
    }
    const eqFields: Record<string, unknown> = {}
    const opFields: Record<string, Record<string, unknown>> = {}
    const containsFilters: Array<{ key: string; val: string }> = []
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (k.includes('_') && v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) {
            eqFields[nk] = nv
          }
          continue
        }
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          const obj = v as Record<string, unknown>
          if ('contains' in obj) { containsFilters.push({ key: k, val: obj.contains as string }); continue }
          if ('gte' in obj || 'gt' in obj || 'lte' in obj || 'lt' in obj) {
            opFields[k] = obj as Record<string, unknown>
            continue
          }
        }
        eqFields[k] = v
      }
    }
    let docs: any[]
    if (Object.keys(eqFields).length > 0) {
      const eqEntries = Object.entries(eqFields)
      const [field, value] = eqEntries[0]
      const snap = await collRef().orderByChild(field).equalTo(toPrimitive(value)).once('value')
      docs = allDocData<any>(snap)
      for (let i = 1; i < eqEntries.length; i++) {
        const [k, v] = eqEntries[i]
        docs = docs.filter(d => d[k] === toPrimitive(v))
      }
    } else {
      const snap = await collRef().once('value')
      docs = allDocData<any>(snap)
    }
    for (const [k, obj] of Object.entries(opFields)) {
      if ('gte' in obj) { const val = toPrimitive(obj.gte) as string; docs = docs.filter(d => d[k] >= val) }
      if ('gt' in obj) { const val = toPrimitive(obj.gt) as string; docs = docs.filter(d => d[k] > val) }
      if ('lte' in obj) { const val = toPrimitive(obj.lte) as string; docs = docs.filter(d => d[k] <= val) }
      if ('lt' in obj) { const val = toPrimitive(obj.lt) as string; docs = docs.filter(d => d[k] < val) }
    }
    for (const { key, val } of containsFilters) {
      const search = val.toLowerCase()
      docs = docs.filter(d => String(d[key] ?? '').toLowerCase().includes(search))
    }
    return docs.length
  }

  async function createMany({ data }: { data: Doc[] }) {
    const updates: Record<string, unknown> = {}
    for (const item of data) {
      const id = collRef().push().key!
      updates[`${name}/${id}`] = { ...deepToPrimitive(item), id, createdAt: now() }
    }
    await rtdb.ref().update(updates)
  }

  async function upsert({ where, update: upd, create: cr }: { where: Where; update: Doc; create: Doc }) {
    const existing = await findUnique({ where })
    if (existing) {
      const toUpdate: Doc = {}
      for (const [k, v] of Object.entries(upd)) {
        if (k !== 'id') toUpdate[k] = toPrimitive(v)
      }
      toUpdate.updatedAt = now()
      await collRef().child(existing.id).update(toUpdate)
      const snap = await collRef().child(existing.id).once('value')
      return docData<any>(snap)!
    }
    const docRef = collRef().push()
    const id = docRef.key!
    const nowVal = now()
    const toCreate: Doc = { ...deepToPrimitive(cr), id, createdAt: nowVal, updatedAt: nowVal }
    await docRef.set(toCreate)
    return { ...toCreate } as any
  }

  async function aggregate({
    _sum,
    _count: doCount,
    where,
  }: { _sum?: Record<string, true>; _count?: boolean; where?: Where } = {}) {
    let docs: any[]
    if (where && Object.keys(where).length > 0) {
      const eqFields: Record<string, unknown> = {}
      const opFields: Record<string, Record<string, unknown>> = {}
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          const obj = v as Record<string, unknown>
          if ('gte' in obj || 'gt' in obj || 'lte' in obj || 'lt' in obj) {
            opFields[k] = obj as Record<string, unknown>
            continue
          }
        }
        eqFields[k] = v
      }
      if (Object.keys(eqFields).length > 0) {
        const eqEntries = Object.entries(eqFields)
        const [field, value] = eqEntries[0]
        const snap = await collRef().orderByChild(field).equalTo(toPrimitive(value)).once('value')
        docs = allDocData<any>(snap)
        for (let i = 1; i < eqEntries.length; i++) {
          const [k, v] = eqEntries[i]
          docs = docs.filter(d => d[k] === toPrimitive(v))
        }
      } else {
        const snap = await collRef().once('value')
        docs = allDocData<any>(snap)
      }
      for (const [k, obj] of Object.entries(opFields)) {
        if ('gte' in obj) { const val = toPrimitive(obj.gte) as string; docs = docs.filter(d => d[k] >= val) }
        if ('lt' in obj) { const val = toPrimitive(obj.lt) as string; docs = docs.filter(d => d[k] < val) }
      }
    } else {
      const snap = await collRef().once('value')
      docs = allDocData<any>(snap)
    }
    const result: Record<string, unknown> = {}
    if (_sum) {
      const sums: Record<string, number> = {}
      for (const field of Object.keys(_sum)) {
        sums[field] = docs.reduce((acc: number, d: any) => {
          const v = d[field]
          return acc + (typeof v === 'number' ? v : 0)
        }, 0)
      }
      result._sum = sums
    }
    if (doCount) result._count = docs.length
    return result
  }

  return {
    findUnique,
    findMany,
    create,
    update,
    delete: remove,
    deleteMany: async ({ where }: { where: Where }) => {
      const docs = await findMany({ where })
      if (docs.length === 0) return
      const updates: Record<string, null> = {}
      for (const doc of docs) {
        updates[`${name}/${doc.id}`] = null
      }
      await rtdb.ref().update(updates)
    },
    count,
    createMany,
    upsert,
    aggregate,
  }
}

export const db = {
  user: collection('users'),
  patient: collection('patients'),
  tooth: collection('teeth'),
  treatment: collection('treatments'),
  appointment: collection('appointments'),
  $transaction: async <T>(fn: (tx: typeof db) => Promise<T>): Promise<T> => {
    const txWrites: Record<string, unknown> = {}

    function readFromTx<T>(name: string, where: Where): T | null {
      const prefix = `${name}/`
      for (const [path, data] of Object.entries(txWrites)) {
        if (!path.startsWith(prefix)) continue
        const doc = data as Doc
        if (where.id !== undefined && path === `${prefix}${where.id}`) return doc as T
        if (where.username !== undefined && doc.username === where.username) return doc as T
        if (where.patientId_toothNumber) {
          const comp = where.patientId_toothNumber as Doc
          if (doc.patientId === comp.patientId && doc.toothNumber === comp.toothNumber) return doc as T
        }
      }
      return null
    }

    function txFindUnique(name: string, where: Where) {
      const pending = readFromTx<any>(name, where)
      return pending ?? collection(name).findUnique({ where })
    }

    function txCollection(name: string) {
      const collRef = () => rtdb.ref(name)
      return {
        findUnique: async ({ where }: { where: Where }) => txFindUnique(name, where),
        findMany: async ({ where, orderBy }: { where?: Where; orderBy?: Order } = {}) => {
          return collection(name).findMany({ where, orderBy })
        },
        create: async ({ data }: { data: Doc }) => {
          const id = collRef().push().key!
          const nowVal = now()
          const saved: Doc = { ...deepToPrimitive(data), id, createdAt: nowVal, updatedAt: nowVal }
          txWrites[`${name}/${id}`] = saved
          return { ...saved } as any
        },
        update: async ({ where, data }: { where: Where; data: Doc }) => {
          const existing = await txFindUnique<any>(name, where)
          if (!existing) throw new Error('Record not found')
          const upd: Doc = {}
          for (const [k, v] of Object.entries(data)) {
            if (k !== 'id') upd[k] = toPrimitive(v)
          }
          upd.updatedAt = now()
          const merged = { ...existing, ...upd, id: existing.id }
          txWrites[`${name}/${existing.id}`] = merged
          return { ...merged } as any
        },
        upsert: async ({ where, update: upd, create: cr }: { where: Where; update: Doc; create: Doc }) => {
          const existing = await txFindUnique<any>(name, where)
          const nowVal = now()
          if (existing) {
            const merged: Doc = { ...existing }
            for (const [k, v] of Object.entries(upd)) {
              if (k !== 'id') merged[k] = toPrimitive(v)
            }
            merged.updatedAt = nowVal
            txWrites[`${name}/${existing.id}`] = merged
            return { ...merged } as any
          }
          const id = collRef().push().key!
          const created: Doc = { ...deepToPrimitive(cr), id, createdAt: nowVal, updatedAt: nowVal }
          txWrites[`${name}/${id}`] = created
          return { ...created } as any
        },
        createMany: async ({ data }: { data: Doc[] }) => {
          for (const item of data) {
            const id = collRef().push().key!
            txWrites[`${name}/${id}`] = { ...deepToPrimitive(item), id, createdAt: now() }
          }
        },
      }
    }

    const txDb = {
      user: txCollection('users'),
      patient: txCollection('patients'),
      tooth: txCollection('teeth'),
      treatment: txCollection('treatments'),
      appointment: txCollection('appointments'),
    }

    const result = await fn(txDb as any)

    if (Object.keys(txWrites).length > 0) {
      await rtdb.ref().update(txWrites)
    }

    return result
  },
}
