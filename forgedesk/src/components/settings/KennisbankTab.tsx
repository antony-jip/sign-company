import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, BookOpen, Tag, ChevronDown, ChevronRight, X, FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  getKbCategories, createKbCategory, updateKbCategory, deleteKbCategory,
  getKbArticles, createKbArticle, updateKbArticle, deleteKbArticle,
} from '@/services/supabaseService'
import { confirm } from '@/components/shared/ConfirmDialog'
import type { KbCategory, KbArticle } from '@/types'
import { logger } from '../../utils/logger'

export function KennisbankTab() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<KbCategory[]>([])
  const [articles, setArticles] = useState<KbArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Editor state
  const [editing, setEditing] = useState<KbArticle | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [formTitel, setFormTitel] = useState('')
  const [formInhoud, setFormInhoud] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formTags, setFormTags] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Category editor
  const [showCatEditor, setShowCatEditor] = useState(false)
  const [catNaam, setCatNaam] = useState('')
  const [editingCat, setEditingCat] = useState<KbCategory | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [cats, arts] = await Promise.all([getKbCategories(), getKbArticles()])
      setCategories(cats)
      setArticles(arts)
    } catch (err) {
      logger.error('Kennisbank laden mislukt:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let list = articles
    if (activeCategory) list = list.filter(a => a.category_id === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.titel.toLowerCase().includes(q) ||
        a.inhoud.toLowerCase().includes(q) ||
        a.zoek_tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [articles, activeCategory, search])

  // ── Article CRUD ──

  function openNewArticle() {
    setEditing(null)
    setIsNew(true)
    setFormTitel('')
    setFormInhoud('')
    setFormCategoryId(activeCategory || '')
    setFormTags('')
  }

  function openEditArticle(article: KbArticle) {
    setEditing(article)
    setIsNew(false)
    setFormTitel(article.titel)
    setFormInhoud(article.inhoud)
    setFormCategoryId(article.category_id || '')
    setFormTags(article.zoek_tags.join(', '))
  }

  function closeEditor() {
    setEditing(null)
    setIsNew(false)
  }

  async function handleSaveArticle() {
    if (!formTitel.trim()) { toast.error('Titel is verplicht'); return }
    setIsSaving(true)
    try {
      const tags = formTags.split(',').map(t => t.trim()).filter(Boolean)
      if (isNew) {
        await createKbArticle({
          user_id: user?.id,
          titel: formTitel.trim(),
          inhoud: formInhoud,
          category_id: formCategoryId || undefined,
          zoek_tags: tags,
          bijlagen: [],
          gepubliceerd: true,
        })
        toast.success('Artikel aangemaakt')
      } else if (editing) {
        await updateKbArticle(editing.id, {
          titel: formTitel.trim(),
          inhoud: formInhoud,
          category_id: formCategoryId || undefined,
          zoek_tags: tags,
        })
        toast.success('Artikel opgeslagen')
      }
      closeEditor()
      await fetchData()
    } catch (err) {
      logger.error('Kon artikel niet opslaan:', err)
      toast.error('Kon artikel niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteArticle(article: KbArticle) {
    const ok = await confirm({ title: 'Artikel verwijderen?', message: `"${article.titel}" wordt permanent verwijderd.`, confirmLabel: 'Verwijderen', variant: 'destructive' })
    if (!ok) return
    try {
      await deleteKbArticle(article.id)
      toast.success('Artikel verwijderd')
      await fetchData()
    } catch (err) {
      logger.error('Kon artikel niet verwijderen:', err)
      toast.error('Kon artikel niet verwijderen')
    }
  }

  // ── Category CRUD ──

  async function handleSaveCategory() {
    if (!catNaam.trim()) return
    try {
      if (editingCat) {
        await updateKbCategory(editingCat.id, { naam: catNaam.trim() })
        toast.success('Categorie bijgewerkt')
      } else {
        await createKbCategory({ user_id: user?.id, naam: catNaam.trim(), volgorde: categories.length })
        toast.success('Categorie aangemaakt')
      }
      setCatNaam('')
      setEditingCat(null)
      setShowCatEditor(false)
      await fetchData()
    } catch (err) {
      logger.error('Kon categorie niet opslaan:', err)
      toast.error('Kon categorie niet opslaan')
    }
  }

  async function handleDeleteCategory(cat: KbCategory) {
    const ok = await confirm({ title: 'Categorie verwijderen?', message: `Artikelen in "${cat.naam}" worden losgekoppeld.`, confirmLabel: 'Verwijderen', variant: 'destructive' })
    if (!ok) return
    try {
      await deleteKbCategory(cat.id)
      if (activeCategory === cat.id) setActiveCategory(null)
      toast.success('Categorie verwijderd')
      await fetchData()
    } catch (err) {
      logger.error('Kon categorie niet verwijderen:', err)
      toast.error('Kon categorie niet verwijderen')
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-6 w-6 border-2 border-[#1A535C] border-t-transparent rounded-full" />
      </div>
    )
  }

  // Article editor view
  if (isNew || editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
            {isNew ? 'Nieuw artikel' : 'Artikel bewerken'}
          </h3>
          <button onClick={closeEditor} className="p-1.5 rounded-lg hover:bg-[#F4F2EE] transition-colors">
            <X className="h-4 w-4 text-[#9B9B95]" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#9B9B95' }}>Titel *</Label>
              <Input
                value={formTitel}
                onChange={e => setFormTitel(e.target.value)}
                placeholder="Bijv. Montage-instructie dibond gevelpanelen"
                className="h-10 text-[14px] rounded-lg"
                style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#9B9B95' }}>Inhoud</Label>
              <Textarea
                value={formInhoud}
                onChange={e => setFormInhoud(e.target.value)}
                placeholder="Schrijf hier het artikel..."
                rows={12}
                className="resize-y text-[13px] rounded-lg leading-relaxed"
                style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#9B9B95' }}>Categorie</Label>
              <select
                value={formCategoryId}
                onChange={e => setFormCategoryId(e.target.value)}
                className="w-full h-9 text-[13px] rounded-lg px-2 bg-[#F8F7F5]"
                style={{ border: '1px solid #EBEBEB' }}
              >
                <option value="">Geen categorie</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.naam}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: '#9B9B95' }}>Tags</Label>
              <Input
                value={formTags}
                onChange={e => setFormTags(e.target.value)}
                placeholder="dibond, montage, gevel"
                className="h-9 text-[13px] rounded-lg"
                style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}
              />
              <p className="text-[10px] mt-1" style={{ color: '#9B9B95' }}>Komma-gescheiden</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSaveArticle}
            disabled={isSaving}
            className="h-9 px-5 text-[13px] font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#1A535C' }}
          >
            {isSaving ? 'Opslaan...' : isNew ? 'Artikel aanmaken' : 'Opslaan'}
          </button>
          <button onClick={closeEditor} className="h-9 px-4 text-[13px] font-medium rounded-lg" style={{ color: '#6B6B66' }}>
            Annuleren
          </button>
        </div>
      </div>
    )
  }

  // Main list view
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Kennisbank</h3>
          <p className="text-[13px]" style={{ color: '#9B9B95' }}>Artikelen, handleidingen en procedures</p>
        </div>
        <button
          onClick={openNewArticle}
          className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: '#F15025' }}
        >
          <Plus className="h-3.5 w-3.5" /> Nieuw artikel
        </button>
      </div>

      {/* Search + Categories */}
      <div className="flex items-start gap-4">
        {/* Category sidebar */}
        <div className="w-[180px] shrink-0 space-y-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
              !activeCategory ? 'bg-[#1A535C]/[0.08] text-[#1A535C]' : 'text-[#6B6B66] hover:bg-[#F4F2EE]'
            )}
          >
            <BookOpen className="h-3.5 w-3.5 inline mr-2" />
            Alle artikelen
            <span className="ml-auto text-[11px] font-mono float-right">{articles.length}</span>
          </button>
          {categories.map(cat => {
            const count = articles.filter(a => a.category_id === cat.id).length
            return (
              <div key={cat.id} className="group flex items-center">
                <button
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className={cn(
                    'flex-1 text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors truncate',
                    activeCategory === cat.id ? 'bg-[#1A535C]/[0.08] text-[#1A535C]' : 'text-[#6B6B66] hover:bg-[#F4F2EE]'
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5 inline mr-2" />
                  {cat.naam}
                  <span className="ml-1 text-[11px] font-mono opacity-50">{count}</span>
                </button>
                <button
                  onClick={() => { setEditingCat(cat); setCatNaam(cat.naam); setShowCatEditor(true) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#F4F2EE] transition-all"
                >
                  <Pencil className="h-3 w-3 text-[#9B9B95]" />
                </button>
              </div>
            )
          })}
          {/* Add / edit category */}
          {showCatEditor ? (
            <div className="px-2 py-2 rounded-lg space-y-2" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}>
              <Input
                value={catNaam}
                onChange={e => setCatNaam(e.target.value)}
                placeholder="Categorie naam"
                className="h-8 text-[12px] rounded-lg"
                style={{ border: '1px solid #EBEBEB' }}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(); if (e.key === 'Escape') { setShowCatEditor(false); setEditingCat(null) } }}
              />
              <div className="flex items-center gap-1">
                <button onClick={handleSaveCategory} className="h-7 px-2 text-[11px] font-semibold rounded text-white" style={{ backgroundColor: '#1A535C' }}>
                  {editingCat ? 'Bijwerken' : 'Toevoegen'}
                </button>
                {editingCat && (
                  <button onClick={() => handleDeleteCategory(editingCat)} className="h-7 px-2 text-[11px] font-medium rounded text-[#C03A18] hover:bg-[#FDE8E2]">
                    Verwijder
                  </button>
                )}
                <button onClick={() => { setShowCatEditor(false); setEditingCat(null); setCatNaam('') }} className="h-7 px-2 text-[11px] text-[#9B9B95]">
                  Annuleer
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowCatEditor(true); setEditingCat(null); setCatNaam('') }}
              className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-[#9B9B95] hover:text-[#1A535C] hover:bg-[#F4F2EE] transition-colors"
            >
              <Plus className="h-3 w-3 inline mr-1.5" /> Categorie
            </button>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B95]" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Zoek artikelen..."
              className="pl-10 h-9 text-[13px] rounded-lg"
              style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}
            />
          </div>

          {/* Articles list */}
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-3 text-[#9B9B95] opacity-30" />
              <p className="text-[14px] font-medium" style={{ color: '#6B6B66' }}>
                {search ? 'Geen artikelen gevonden' : 'Nog geen artikelen'}
              </p>
              <p className="text-[12px] mt-1" style={{ color: '#9B9B95' }}>
                {search ? 'Probeer andere zoektermen' : 'Maak je eerste artikel aan'}
              </p>
              {!search && (
                <button
                  onClick={openNewArticle}
                  className="mt-3 text-[13px] font-semibold text-[#F15025] hover:underline"
                >
                  Eerste artikel schrijven
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(article => {
                const cat = categories.find(c => c.id === article.category_id)
                const excerpt = article.inhoud.replace(/<[^>]+>/g, '').substring(0, 120)
                return (
                  <div
                    key={article.id}
                    className="group bg-white rounded-xl p-4 border border-[#EBEBEB]/60 hover:border-[#1A535C]/20 hover:shadow-sm cursor-pointer transition-all"
                    onClick={() => openEditArticle(article)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-[14px] font-semibold text-[#1A1A1A] truncate group-hover:text-[#1A535C] transition-colors">
                            {article.titel}
                          </h4>
                          {cat && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}>
                              {cat.naam}
                            </span>
                          )}
                        </div>
                        {excerpt && (
                          <p className="text-[12px] text-[#9B9B95] truncate">{excerpt}</p>
                        )}
                        {article.zoek_tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Tag className="h-2.5 w-2.5 text-[#9B9B95]" />
                            {article.zoek_tags.slice(0, 4).map(tag => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F4F2EE] text-[#6B6B66]">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteArticle(article) }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#FDE8E2] transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[#C03A18]" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
