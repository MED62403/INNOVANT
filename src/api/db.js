import { supabase } from './supabaseClient'

function parseSort(sort) {
  if (!sort) return null
  if (sort.startsWith('-')) return { column: sort.slice(1), ascending: false }
  return { column: sort, ascending: true }
}

function createEntityAdapter(tableName) {
  return {
    async list(sort) {
      if (!supabase) return []
      let q = supabase.from(tableName).select('*')
      const s = parseSort(sort)
      if (s) q = q.order(s.column, { ascending: s.ascending })
      const { data, error } = await q
      if (error) throw error
      return data || []
    },

    async get(id) {
      if (!supabase) return null
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single()
      if (error) throw error
      return data
    },

    async create(payload) {
      if (!supabase) return { id: crypto.randomUUID(), ...payload }
      const { data, error } = await supabase.from(tableName).insert(payload).select().single()
      if (error) throw error
      return data
    },

    async update(id, payload) {
      if (!supabase) return { id, ...payload }
      const { data, error } = await supabase
        .from(tableName).update(payload).eq('id', id).select().single()
      if (error) throw error
      return data
    },

    async delete(id) {
      if (!supabase) return
      const { error } = await supabase.from(tableName).delete().eq('id', id)
      if (error) throw error
    },

    async filter(conditions, sort) {
      if (!supabase) return []
      let q = supabase.from(tableName).select('*')
      Object.entries(conditions).forEach(([key, val]) => { q = q.eq(key, val) })
      const s = parseSort(sort)
      if (s) q = q.order(s.column, { ascending: s.ascending })
      const { data, error } = await q
      if (error) throw error
      return data || []
    },

    async bulkCreate(items) {
      if (!supabase || !items.length) return items
      const { data, error } = await supabase.from(tableName).insert(items).select()
      if (error) throw error
      return data || []
    },

    subscribe(callback) {
      if (!supabase) return () => {}
      const channel = supabase
        .channel(`${tableName}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
        .subscribe()
      return () => supabase.removeChannel(channel)
    },
  }
}

export const db = {
  entities: {
    Client:             createEntityAdapter('clients'),
    Facture:            createEntityAdapter('factures'),
    Paiement:           createEntityAdapter('paiements'),
    Devis:              createEntityAdapter('devis'),
    Depense:            createEntityAdapter('depenses'),
    Stock:              createEntityAdapter('stocks'),
    Personnel:          createEntityAdapter('personnel'),
    Presence:           createEntityAdapter('presences'),
    Intervention:       createEntityAdapter('interventions'),
    ServiceBibliotheque:createEntityAdapter('services_bibliotheque'),
    User:               createEntityAdapter('profiles'),
  },

  auth: {
    async me() {
      if (!supabase) return null
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    async logout(redirectUrl) {
      if (supabase) await supabase.auth.signOut()
      window.location.href = redirectUrl || '/'
    },
    redirectToLogin() {
      window.location.href = '/login'
    },
    async updateMe(updates) {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').update(updates).eq('id', user.id)
    },
  },

  functions: {
    async invoke(name, payload) {
      if (!supabase) return { data: {} }
      const { data, error } = await supabase.functions.invoke(name, { body: payload })
      if (error) throw error
      return { data }
    },
  },

  integrations: {
    Core: {
      async SendEmail(params) {
        if (!supabase) return
        return supabase.functions.invoke('send-email', { body: params })
      },
      async UploadFile({ file }) {
        if (!supabase) return { file_url: null }
        const filename = `${crypto.randomUUID()}-${file.name}`
        const { data, error } = await supabase.storage.from('uploads').upload(filename, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(data.path)
        return { file_url: publicUrl }
      },
      async ExtractDataFromUploadedFile() {
        return { data: [] }
      },
    },
  },
}
