import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, FileText, FolderKanban, Receipt, ClipboardCheck, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getOfferte, getProject, getDeal, getFactuur, getWerkbon } from '@/services/supabaseService'
import type { Offerte, Project, Deal, Factuur, Werkbon } from '@/types'

interface ChainNode {
  type: 'deal' | 'offerte' | 'project' | 'factuur' | 'werkbon'
  id: string
  label: string
  path: string
  active?: boolean
}

const NODE_CONFIG = {
  deal: { icon: Briefcase, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  offerte: { icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  project: { icon: FolderKanban, color: 'text-accent dark:text-primary', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
  factuur: { icon: Receipt, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
  werkbon: { icon: ClipboardCheck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
}

interface DocumentChainIndicatorProps {
  /** Current document type */
  type: 'deal' | 'offerte' | 'project' | 'factuur' | 'werkbon'
  /** Current document data — pass any of the supported types */
  deal?: Deal | null
  offerte?: Offerte | null
  project?: Project | null
  factuur?: Factuur | null
  werkbon?: Werkbon | null
}

export function DocumentChainIndicator({ type, deal, offerte, project, factuur, werkbon }: DocumentChainIndicatorProps) {
  const [chain, setChain] = useState<ChainNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function buildChain() {
      const nodes: ChainNode[] = []

      try {
        if (type === 'deal' && deal) {
          nodes.push({ type: 'deal', id: deal.id, label: deal.titel, path: `/deals/${deal.id}`, active: true })

          // Show linked offertes (max 2)
          if (deal.offerte_ids?.length) {
            for (const oid of deal.offerte_ids.slice(0, 2)) {
              const o = await getOfferte(oid)
              if (o && !cancelled) {
                nodes.push({ type: 'offerte', id: o.id, label: o.nummer, path: `/offertes/${o.id}` })
              }
            }
          }
        }

        if (type === 'offerte' && offerte) {
          // Upstream: deal
          if (offerte.deal_id) {
            const d = await getDeal(offerte.deal_id)
            if (d && !cancelled) {
              nodes.push({ type: 'deal', id: d.id, label: d.titel, path: `/deals/${d.id}` })
            }
          }

          nodes.push({ type: 'offerte', id: offerte.id, label: offerte.nummer, path: `/offertes/${offerte.id}`, active: true })

          // Downstream: project
          const projectId = offerte.geconverteerd_naar_project_id || offerte.project_id
          if (projectId) {
            const p = await getProject(projectId)
            if (p && !cancelled) {
              nodes.push({ type: 'project', id: p.id, label: p.naam, path: `/projecten/${p.id}` })
            }
          }

          // Downstream: factuur
          if (offerte.geconverteerd_naar_factuur_id) {
            const f = await getFactuur(offerte.geconverteerd_naar_factuur_id)
            if (f && !cancelled) {
              nodes.push({ type: 'factuur', id: f.id, label: f.nummer, path: `/facturen` })
            }
          }
        }

        if (type === 'project' && project) {
          // Upstream: offerte
          if (project.bron_offerte_id) {
            const o = await getOfferte(project.bron_offerte_id)
            if (o && !cancelled) {
              nodes.push({ type: 'offerte', id: o.id, label: o.nummer, path: `/offertes/${o.id}` })

              // Upstream of offerte: deal
              if (o.deal_id) {
                const d = await getDeal(o.deal_id)
                if (d && !cancelled) {
                  nodes.unshift({ type: 'deal', id: d.id, label: d.titel, path: `/deals/${d.id}` })
                }
              }
            }
          }

          nodes.push({ type: 'project', id: project.id, label: project.naam, path: `/projecten/${project.id}`, active: true })
        }

        if (type === 'factuur' && factuur) {
          // Upstream: offerte
          const offerteId = factuur.bron_offerte_id || factuur.offerte_id
          if (offerteId) {
            const o = await getOfferte(offerteId)
            if (o && !cancelled) {
              // Deal upstream of offerte
              if (o.deal_id) {
                const d = await getDeal(o.deal_id)
                if (d && !cancelled) {
                  nodes.push({ type: 'deal', id: d.id, label: d.titel, path: `/deals/${d.id}` })
                }
              }
              nodes.push({ type: 'offerte', id: o.id, label: o.nummer, path: `/offertes/${o.id}` })
            }
          }

          // Upstream: project
          const projectId = factuur.bron_project_id || factuur.project_id
          if (projectId) {
            const p = await getProject(projectId)
            if (p && !cancelled) {
              // Only add project if not already implied by offerte chain
              if (!nodes.find((n) => n.type === 'project')) {
                nodes.push({ type: 'project', id: p.id, label: p.naam, path: `/projecten/${p.id}` })
              }
            }
          }

          nodes.push({ type: 'factuur', id: factuur.id, label: factuur.nummer, path: `/facturen`, active: true })
        }

        if (type === 'werkbon' && werkbon) {
          // Upstream: project
          if (werkbon.project_id) {
            const p = await getProject(werkbon.project_id)
            if (p && !cancelled) {
              // Upstream of project: offerte
              if (p.bron_offerte_id) {
                const o = await getOfferte(p.bron_offerte_id)
                if (o && !cancelled) {
                  nodes.push({ type: 'offerte', id: o.id, label: o.nummer, path: `/offertes/${o.id}` })
                }
              }
              nodes.push({ type: 'project', id: p.id, label: p.naam, path: `/projecten/${p.id}` })
            }
          }

          nodes.push({ type: 'werkbon', id: werkbon.id, label: werkbon.werkbon_nummer, path: `/werkbonnen/${werkbon.id}`, active: true })

          // Downstream: factuur
          if (werkbon.factuur_id) {
            const f = await getFactuur(werkbon.factuur_id)
            if (f && !cancelled) {
              nodes.push({ type: 'factuur', id: f.id, label: f.nummer, path: `/facturen` })
            }
          }
        }
      } catch {
        // Silently fail — chain is optional UX
      }

      if (!cancelled) {
        setChain(nodes)
        setLoading(false)
      }
    }

    buildChain()
    return () => { cancelled = true }
  }, [type, deal, offerte, project, factuur, werkbon])

  // Don't render if there's only the current node or nothing
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Keten laden...</span>
      </div>
    )
  }

  if (chain.length <= 1) return null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mr-1">Keten</span>
      {chain.map((node, i) => {
        const config = NODE_CONFIG[node.type]
        const Icon = config.icon
        return (
          <React.Fragment key={`${node.type}-${node.id}`}>
            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />}
            {node.active ? (
              <Badge variant="outline" className={`${config.bg} ${config.border} ${config.color} text-[11px] font-medium gap-1 py-0.5`}>
                <Icon className="h-3 w-3" />
                {node.label}
              </Badge>
            ) : (
              <Link to={node.path}>
                <Badge variant="outline" className={`${config.bg} ${config.border} ${config.color} text-[11px] font-medium gap-1 py-0.5 hover:opacity-80 transition-opacity cursor-pointer`}>
                  <Icon className="h-3 w-3" />
                  {node.label}
                </Badge>
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
