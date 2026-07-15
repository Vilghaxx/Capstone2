import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import path from 'path'

const KEY_PATH =
  process.env.FIREBASE_KEY_PATH ??
  path.join(process.cwd(), 'capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json')

if (!getApps().length) {
  try {
    const sa = JSON.parse(readFileSync(KEY_PATH, 'utf-8'))
    initializeApp({ credential: cert(sa) })
    console.log('[firebase] Admin SDK initialized')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[firebase] Init failed: ${msg}`)
    console.error(`[firebase] Check key at: ${KEY_PATH}`)
  }
}

const firestore = getFirestore()

type Doc = Record<string, unknown>
type Where = Record<string, unknown>
type Order = Record<string, 'asc' | 'desc'> | Array<{ field: string; direction: 'asc' | 'desc' }>

function docData<T>(doc: FirebaseFirestore.DocumentSnapshot): T | null {
  if (!doc.exists) return null
  const d = doc.data()!
  const out: Record<string, unknown> = { id: doc.id }
  for (const [k, v] of Object.entries(d)) {
    out[k] = v instanceof Timestamp ? v.toDate().toISOString() : v
  }
  return out as T
}

function now() {
  return Timestamp.now()
}

function resolveCompound(where: Where): Array<{ key: string; val: unknown }> {
  const out: Array<{ key: string; val: unknown }> = []
  for (const [k, v] of Object.entries(where)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        out.push({ key: ik, val: iv })
      }
    } else {
      out.push({ key: k, val: v })
    }
  }
  return out
}

function collection(name: string) {
  const ref = () => firestore.collection(name)

  async function findUnique({ where }: { where: Where }) {
    const compounds = resolveCompound(where)
    let q: FirebaseFirestore.Query = ref()
    for (const { key, val } of compounds) q = q.where(key, '==', val)
    const snap = await q.limit(2).get()
    return snap.empty ? null : docData<any>(snap.docs[0])
  }

  async function findMany({
    where,
    orderBy,
    skip,
    take,
    select,
  }: { where?: Where; orderBy?: Order; skip?: number; take?: number; select?: Record<string, true> } = {}) {
    let q: FirebaseFirestore.Query = ref()

    const containsFilters: Array<{ key: string; val: string }> = []
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof Timestamp)) {
          const obj = v as Record<string, unknown>
          if ('contains' in obj) { containsFilters.push({ key: k, val: obj.contains as string }); continue }
          if ('in' in obj && Array.isArray(obj.in)) { q = q.where(k, 'in', obj.in); continue }
          if ('gte' in obj) { const val: any = obj.gte; q = obj.lt !== undefined ? q.where(k, '>=', val).where(k, '<', obj.lt) : q.where(k, '>=', val); continue }
          if ('gt' in obj) { q = q.where(k, '>', obj.gt); continue }
          if ('lte' in obj) { q = q.where(k, '<=', obj.lte); continue }
          if ('lt' in obj) { q = q.where(k, '<', obj.lt); continue }
        } else {
          q = q.where(k, '==', v)
        }
      }
    }

    if (orderBy) {
      const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
      for (const o of orders) {
        const e = Object.entries(o)[0]
        if (e) q = q.orderBy(e[0], e[1] as any)
      }
    }

    if (skip) q = q.offset(skip)
    if (take) q = q.limit(take)

    const snap = await q.get()
    let results = snap.docs.map(d => docData<any>(d)!)

    for (const { key, val } of containsFilters) {
      const search = val.toLowerCase()
      results = results.filter(r => String((r as any)[key] ?? '').toLowerCase().includes(search))
    }

    if (select) {
      const keys = Object.keys(select)
      results = results.map(r => {
        const out: Record<string, unknown> = {}
        for (const k of keys) out[k] = (r as any)[k]
        return out as any
      })
    }

    return results
  }

  async function create({ data }: { data: Doc }) {
    const d = ref().doc()
    const saved: Doc = { ...data, id: d.id, createdAt: now(), updatedAt: now() }
    delete saved.id
    await d.set({ ...data, id: d.id, createdAt: now(), updatedAt: now() } as Doc)
    return docData<any>(await d.get())!
  }

  async function update({ where, data }: { where: Where; data: Doc }) {
    const compounds = resolveCompound(where)
    let q: FirebaseFirestore.Query = ref()
    for (const { key, val } of compounds) q = q.where(key, '==', val)
    const snap = await q.limit(2).get()
    if (snap.empty) throw new Error('Record not found')
    const doc = snap.docs[0]
    const upd: Doc = { ...data, updatedAt: now() }
    delete upd.id
    await doc.ref.update(upd)
    return docData<any>(await doc.ref.get())!
  }

  async function remove({ where }: { where: Where }) {
    const compounds = resolveCompound(where)
    let q: FirebaseFirestore.Query = ref()
    for (const { key, val } of compounds) q = q.where(key, '==', val)
    const snap = await q.limit(2).get()
    if (snap.empty) throw new Error('Record not found')
    await snap.docs[0].ref.delete()
  }

  async function count({ where }: { where?: Where } = {}) {
    if (!where || Object.keys(where).length === 0) {
      const snap = await ref().count().get()
      return snap.data().count
    }
    let q: FirebaseFirestore.Query = ref()
    for (const [k, v] of Object.entries(where)) {
      q = q.where(k, '==', v)
    }
    const snap = await q.count().get()
    return snap.data().count
  }

  async function createMany({ data }: { data: Doc[] }) {
    const batch = firestore.batch()
    for (const item of data) {
      const d = ref().doc()
      batch.set(d, { ...item, id: d.id, createdAt: now() })
    }
    await batch.commit()
  }

  async function upsert({ where, update: upd, create: cr }: { where: Where; update: Doc; create: Doc }) {
    const compounds = resolveCompound(where)
    let q: FirebaseFirestore.Query = ref()
    for (const { key, val } of compounds) q = q.where(key, '==', val)
    const snap = await q.limit(2).get()

    if (snap.empty) {
      const d = ref().doc()
      const toCreate: Doc = { ...cr, id: d.id, createdAt: now(), updatedAt: now() }
      await d.set(toCreate)
      return docData<any>(await d.get())!
    }

    const doc = snap.docs[0]
    const toUpdate: Doc = { ...upd, updatedAt: now() }
    delete toUpdate.id
    await doc.ref.update(toUpdate)
    return docData<any>(await doc.ref.get())!
  }

  async function aggregate({ _sum, _count: doCount, where }: { _sum?: Record<string, true>; _count?: boolean; where?: Where }) {
    let q: FirebaseFirestore.Query = ref()
    if (where) {
      for (const [k, v] of Object.entries(where)) q = q.where(k, '==', v)
    }
    const snap = await q.get()
    const result: Record<string, unknown> = {}

    if (_sum) {
      const sums: Record<string, number> = {}
      for (const field of Object.keys(_sum)) {
        sums[field] = snap.docs.reduce((acc, d) => {
          const v = d.data()[field]
          return acc + (typeof v === 'number' ? v : 0)
        }, 0)
      }
      result._sum = sums
    }

    if (doCount) result._count = snap.size

    return result
  }

  return {
    findUnique,
    findMany,
    create,
    update,
    delete: remove,
    deleteMany: async ({ where }: { where: Where }) => {
      let q: FirebaseFirestore.Query = ref()
      for (const [k, v] of Object.entries(where)) q = q.where(k, '==', v)
      const snap = await q.get()
      const batch = firestore.batch()
      snap.docs.forEach(d => batch.delete(d.ref))
      await batch.commit()
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
    return await firestore.runTransaction(async (txn) => {
      const txDb = {
        user: txCollection('users', txn),
        patient: txCollection('patients', txn),
        tooth: txCollection('teeth', txn),
        treatment: txCollection('treatments', txn),
        appointment: txCollection('appointments', txn),
      }
      return await fn(txDb as any)
    })
  },
}

function txCollection(name: string, txn: FirebaseFirestore.Transaction) {
  const ref = () => firestore.collection(name)
  return {
    findUnique: async ({ where }: { where: Where }) => {
      const compounds = resolveCompound(where)
      let q: FirebaseFirestore.Query = ref()
      for (const { key, val } of compounds) q = q.where(key, '==', val)
      const snap = await txn.get(q.limit(2))
      return snap.empty ? null : docData<any>(snap.docs[0])
    },
    findMany: async ({ where, orderBy }: { where?: Where; orderBy?: Order } = {}) => {
      let q: FirebaseFirestore.Query = ref()
      if (where) {
        for (const [k, v] of Object.entries(where)) {
          if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof Timestamp)) {
            const obj = v as Record<string, unknown>
            if ('contains' in obj) { continue }
            if ('in' in obj && Array.isArray(obj.in)) { q = q.where(k, 'in', obj.in); continue }
            if ('gte' in obj) { q = q.where(k, '>=', obj.gte); if (obj.lt !== undefined) q = q.where(k, '<', obj.lt); continue }
          } else {
            q = q.where(k, '==', v)
          }
        }
      }
      if (orderBy) {
        const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
        for (const o of orders) {
          const e = Object.entries(o)[0]
          if (e) q = q.orderBy(e[0], e[1] as any)
        }
      }
      const snap = await txn.get(q)
      return snap.docs.map(d => docData<any>(d)!)
    },
    create: async ({ data }: { data: Doc }) => {
      const d = ref().doc()
      const saved: Doc = { ...data, id: d.id, createdAt: now(), updatedAt: now() }
      txn.set(d, saved)
      return { ...saved } as any
    },
    update: async ({ where, data }: { where: Where; data: Doc }) => {
      const compounds = resolveCompound(where)
      let q: FirebaseFirestore.Query = ref()
      for (const { key, val } of compounds) q = q.where(key, '==', val)
      const snap = await txn.get(q.limit(2))
      if (snap.empty) throw new Error('Record not found')
      const doc = snap.docs[0]
      const upd: Doc = { ...data, updatedAt: now() }
      delete upd.id
      txn.update(doc.ref, upd)
      return { id: doc.id, ...doc.data(), ...upd } as any
    },
    upsert: async ({ where, update: upd, create: cr }: { where: Where; update: Doc; create: Doc }) => {
      const compounds = resolveCompound(where)
      let q: FirebaseFirestore.Query = ref()
      for (const { key, val } of compounds) q = q.where(key, '==', val)
      const snap = await txn.get(q.limit(2))
      if (snap.empty) {
        const d = ref().doc()
        const toCreate: Doc = { ...cr, id: d.id, createdAt: now(), updatedAt: now() }
        txn.set(d, toCreate)
        return toCreate as any
      }
      const doc = snap.docs[0]
      const toUpdate: Doc = { ...upd, updatedAt: now() }
      delete toUpdate.id
      txn.update(doc.ref, toUpdate)
      return { id: doc.id, ...doc.data(), ...toUpdate } as any
    },
    createMany: async ({ data }: { data: Doc[] }) => {
      for (const item of data) {
        const d = ref().doc()
        txn.set(d, { ...item, id: d.id, createdAt: now() })
      }
    },
    deleteMany: async ({ where }: { where: Where }) => {
      let q: FirebaseFirestore.Query = ref()
      for (const [k, v] of Object.entries(where)) q = q.where(k, '==', v)
      const snap = await txn.get(q)
      snap.docs.forEach(d => txn.delete(d.ref))
    },
  }
}
