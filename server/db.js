const { initializeApp, getApps, cert } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const { readFileSync } = require('fs')
const path = require('path')

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[firebase] Init failed: ${msg}`)
    console.error(`[firebase] Check key at: ${KEY_PATH}`)
  }
}

const rtdb = getDatabase()

function now() {
  return new Date().toISOString()
}

function docData(snap) {
  if (!snap.exists()) return null
  const val = snap.val()
  if (typeof val !== 'object' || val === null) return { id: snap.key, value: val }
  return { id: snap.key, ...val }
}

function allDocData(snap) {
  if (!snap.exists()) return []
  const results = []
  snap.forEach((child) => {
    results.push(docData(child))
  })
  return results
}

function toPrimitive(v) {
  if (v instanceof Date) return v.toISOString()
  return v
}

function deepToPrimitive(data) {
  const out = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id') continue
    if (v instanceof Date) { out[k] = v.toISOString(); continue }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = {}
      for (const [nk, nv] of Object.entries(v)) {
        nested[nk] = toPrimitive(nv)
      }
      out[k] = nested
    } else {
      out[k] = v
    }
  }
  return out
}

function collection(name) {
  const collRef = () => rtdb.ref(name)

  async function findUnique({ where }) {
    const keys = Object.keys(where)
    if (keys.length === 1 && keys[0] === 'id') {
      const snap = await collRef().child(String(where.id)).once('value')
      return docData(snap)
    }

    if (keys.length === 1 && keys[0].includes('_')) {
      const v = where[keys[0]]
      const entries = Object.entries(v)
      const snap = await collRef().orderByChild(entries[0][0]).equalTo(toPrimitive(entries[0][1])).once('value')
      const docs = allDocData(snap)
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
      return { id: childKey, ...val[childKey] }
    }

    const entries = Object.entries(where)
    const [firstField, firstVal] = entries[0]
    const snap = await collRef().orderByChild(firstField).equalTo(toPrimitive(firstVal)).once('value')
    const docs = allDocData(snap)
    return docs.find(d => entries.slice(1).every(([k, kv]) => d[k] === toPrimitive(kv))) ?? null
  }

  async function findMany({
    where,
    orderBy,
    skip,
    take,
    select,
  } = {}) {
    const eqFields = {}
    const opFields = {}
    const containsFilters = []
    let inFilter = null

    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (k.includes('_') && v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          for (const [nk, nv] of Object.entries(v)) {
            eqFields[nk] = nv
          }
          continue
        }
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          const obj = v
          if ('contains' in obj) { containsFilters.push({ key: k, val: obj.contains }); continue }
          if ('in' in obj && Array.isArray(obj.in)) { inFilter = { key: k, vals: obj.in }; continue }
          if ('gte' in obj || 'gt' in obj || 'lte' in obj || 'lt' in obj) {
            opFields[k] = obj
            continue
          }
        }
        eqFields[k] = v
      }
    }

    let docs

    if (inFilter && inFilter.key === 'id' && Object.keys(eqFields).length === 0 && Object.keys(opFields).length === 0 && containsFilters.length === 0) {
      const results = []
      for (const id of inFilter.vals) {
        const snap = await collRef().child(String(id)).once('value')
        if (snap.exists()) results.push({ id: snap.key, ...snap.val() })
      }
      docs = results
    } else if (Object.keys(eqFields).length > 0) {
      const eqEntries = Object.entries(eqFields)
      const [field, value] = eqEntries[0]
      const snap = await collRef().orderByChild(field).equalTo(toPrimitive(value)).once('value')
      docs = allDocData(snap)
      for (let i = 1; i < eqEntries.length; i++) {
        const [k, v] = eqEntries[i]
        const pv = toPrimitive(v)
        docs = docs.filter(d => d[k] === pv)
      }
    } else {
      const snap = await collRef().once('value')
      docs = allDocData(snap)
    }

    for (const [k, obj] of Object.entries(opFields)) {
      if ('gte' in obj) {
        const val = toPrimitive(obj.gte)
        docs = docs.filter(d => d[k] >= val)
      }
      if ('gt' in obj) {
        const val = toPrimitive(obj.gt)
        docs = docs.filter(d => d[k] > val)
      }
      if ('lte' in obj) {
        const val = toPrimitive(obj.lte)
        docs = docs.filter(d => d[k] <= val)
      }
      if ('lt' in obj) {
        const val = toPrimitive(obj.lt)
        docs = docs.filter(d => d[k] < val)
      }
    }

    if (inFilter) {
      docs = docs.filter(d => inFilter.vals.includes(d[inFilter.key]))
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
      docs = docs.map((r) => {
        const out = {}
        for (const k of keys) out[k] = r[k]
        return out
      })
    }

    return docs
  }

  async function create({ data }) {
    const docRef = collRef().push()
    const id = docRef.key
    const saved = { ...deepToPrimitive(data), id, createdAt: now(), updatedAt: now() }
    await docRef.set(saved)
    return { ...saved }
  }

  async function update({ where, data }) {
    const existing = await findUnique({ where })
    if (!existing) throw new Error('Record not found')
    const id = existing.id
    const upd = {}
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'id') upd[k] = toPrimitive(v)
    }
    upd.updatedAt = now()
    await collRef().child(id).update(upd)
    const snap = await collRef().child(id).once('value')
    return docData(snap)
  }

  async function remove({ where }) {
    const existing = await findUnique({ where })
    if (!existing) throw new Error('Record not found')
    await collRef().child(existing.id).remove()
  }

  async function count({ where } = {}) {
    if (!where || Object.keys(where).length === 0) {
      const snap = await collRef().once('value')
      return snap.exists() ? Object.keys(snap.val()).length : 0
    }
    const eqFields = {}
    const opFields = {}
    const containsFilters = []
    if (where) {
      for (const [k, v] of Object.entries(where)) {
        if (k.includes('_') && v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          for (const [nk, nv] of Object.entries(v)) {
            eqFields[nk] = nv
          }
          continue
        }
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          const obj = v
          if ('contains' in obj) { containsFilters.push({ key: k, val: obj.contains }); continue }
          if ('gte' in obj || 'gt' in obj || 'lte' in obj || 'lt' in obj) {
            opFields[k] = obj
            continue
          }
        }
        eqFields[k] = v
      }
    }
    let docs
    if (Object.keys(eqFields).length > 0) {
      const eqEntries = Object.entries(eqFields)
      const [field, value] = eqEntries[0]
      const snap = await collRef().orderByChild(field).equalTo(toPrimitive(value)).once('value')
      docs = allDocData(snap)
      for (let i = 1; i < eqEntries.length; i++) {
        const [k, v] = eqEntries[i]
        docs = docs.filter(d => d[k] === toPrimitive(v))
      }
    } else {
      const snap = await collRef().once('value')
      docs = allDocData(snap)
    }
    for (const [k, obj] of Object.entries(opFields)) {
      if ('gte' in obj) { const val = toPrimitive(obj.gte); docs = docs.filter(d => d[k] >= val) }
      if ('lt' in obj) { const val = toPrimitive(obj.lt); docs = docs.filter(d => d[k] < val) }
    }
    for (const { key, val } of containsFilters) {
      const search = val.toLowerCase()
      docs = docs.filter(d => String(d[key] ?? '').toLowerCase().includes(search))
    }
    return docs.length
  }

  async function createMany({ data }) {
    const updates = {}
    for (const item of data) {
      const id = collRef().push().key
      updates[`${name}/${id}`] = { ...deepToPrimitive(item), id, createdAt: now() }
    }
    await rtdb.ref().update(updates)
  }

  async function upsert({ where, update: upd, create: cr }) {
    const existing = await findUnique({ where })
    if (existing) {
      const toUpdate = {}
      for (const [k, v] of Object.entries(upd)) {
        if (k !== 'id') toUpdate[k] = toPrimitive(v)
      }
      toUpdate.updatedAt = now()
      await collRef().child(existing.id).update(toUpdate)
      const snap = await collRef().child(existing.id).once('value')
      return docData(snap)
    }
    const docRef = collRef().push()
    const id = docRef.key
    const nowVal = now()
    const toCreate = { ...deepToPrimitive(cr), id, createdAt: nowVal, updatedAt: nowVal }
    await docRef.set(toCreate)
    return { ...toCreate }
  }

  async function aggregate({
    _sum,
    _count: doCount,
    where,
  } = {}) {
    let docs
    if (where && Object.keys(where).length > 0) {
      const eqFields = {}
      const opFields = {}
      for (const [k, v] of Object.entries(where)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
          const obj = v
          if ('gte' in obj || 'gt' in obj || 'lte' in obj || 'lt' in obj) {
            opFields[k] = obj
            continue
          }
        }
        eqFields[k] = v
      }
      if (Object.keys(eqFields).length > 0) {
        const eqEntries = Object.entries(eqFields)
        const [field, value] = eqEntries[0]
        const snap = await collRef().orderByChild(field).equalTo(toPrimitive(value)).once('value')
        docs = allDocData(snap)
        for (let i = 1; i < eqEntries.length; i++) {
          const [k, v] = eqEntries[i]
          docs = docs.filter(d => d[k] === toPrimitive(v))
        }
      } else {
        const snap = await collRef().once('value')
        docs = allDocData(snap)
      }
      for (const [k, obj] of Object.entries(opFields)) {
        if ('gte' in obj) { const val = toPrimitive(obj.gte); docs = docs.filter(d => d[k] >= val) }
        if ('lt' in obj) { const val = toPrimitive(obj.lt); docs = docs.filter(d => d[k] < val) }
      }
    } else {
      const snap = await collRef().once('value')
      docs = allDocData(snap)
    }
    const result = {}
    if (_sum) {
      const sums = {}
      for (const field of Object.keys(_sum)) {
        sums[field] = docs.reduce((acc, d) => {
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
    deleteMany: async ({ where }) => {
      const docs = await findMany({ where })
      if (docs.length === 0) return
      const updates = {}
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

const db = {
  user: collection('users'),
  patient: collection('patients'),
  tooth: collection('teeth'),
  treatment: collection('treatments'),
  appointment: collection('appointments'),
  $transaction: async (fn) => {
    const txWrites = {}

    function readFromTx(name, where) {
      const prefix = `${name}/`
      for (const [path, data] of Object.entries(txWrites)) {
        if (!path.startsWith(prefix)) continue
        const doc = data
        if (where.id !== undefined && path === `${prefix}${where.id}`) return doc
        if (where.username !== undefined && doc.username === where.username) return doc
        if (where.patientId_toothNumber) {
          const comp = where.patientId_toothNumber
          if (doc.patientId === comp.patientId && doc.toothNumber === comp.toothNumber) return doc
        }
      }
      return null
    }

    function txFindUnique(name, where) {
      const pending = readFromTx(name, where)
      return pending ?? collection(name).findUnique({ where })
    }

    function txCollection(name) {
      const collRef = () => rtdb.ref(name)
      return {
        findUnique: async ({ where }) => txFindUnique(name, where),
        findMany: async ({ where, orderBy } = {}) => {
          return collection(name).findMany({ where, orderBy })
        },
        create: async ({ data }) => {
          const id = collRef().push().key
          const nowVal = now()
          const saved = { ...deepToPrimitive(data), id, createdAt: nowVal, updatedAt: nowVal }
          txWrites[`${name}/${id}`] = saved
          return { ...saved }
        },
        update: async ({ where, data }) => {
          const existing = await txFindUnique(name, where)
          if (!existing) throw new Error('Record not found')
          const upd = {}
          for (const [k, v] of Object.entries(data)) {
            if (k !== 'id') upd[k] = toPrimitive(v)
          }
          upd.updatedAt = now()
          const merged = { ...existing, ...upd, id: existing.id }
          txWrites[`${name}/${existing.id}`] = merged
          return { ...merged }
        },
        upsert: async ({ where, update: upd, create: cr }) => {
          const existing = await txFindUnique(name, where)
          const nowVal = now()
          if (existing) {
            const merged = { ...existing }
            for (const [k, v] of Object.entries(upd)) {
              if (k !== 'id') merged[k] = toPrimitive(v)
            }
            merged.updatedAt = nowVal
            txWrites[`${name}/${existing.id}`] = merged
            return { ...merged }
          }
          const id = collRef().push().key
          const created = { ...deepToPrimitive(cr), id, createdAt: nowVal, updatedAt: nowVal }
          txWrites[`${name}/${id}`] = created
          return { ...created }
        },
        createMany: async ({ data }) => {
          for (const item of data) {
            const id = collRef().push().key
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

    const result = await fn(txDb)

    if (Object.keys(txWrites).length > 0) {
      await rtdb.ref().update(txWrites)
    }

    return result
  },
}

module.exports = { db }
