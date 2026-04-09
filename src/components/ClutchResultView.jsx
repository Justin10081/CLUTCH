import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { getAuthToken } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────
const BLUE = '#3b82f6'
const CYAN = '#06b6d4'
const VIOLET = '#8b5cf6'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const GREEN = '#34d399'
const ease = [0.16, 1, 0.3, 1]
const CONCEPT_ACCENTS = [BLUE, CYAN, VIOLET, AMBER, GREEN, '#f43f5e', '#ec4899', '#10b981']

// ─── ScanSection ──────────────────────────────────────────────────────────────
function ScanSection({ scene, title, accent = BLUE, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.55, ease, delay }}
      style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 900, color: accent, letterSpacing: '0.18em', padding: '4px 10px', border: `1px solid ${accent}40`, borderRadius: 4, fontFamily: 'ui-monospace, monospace', flexShrink: 0, background: `${accent}08` }}>{scene}</div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}35, transparent)` }} />
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{title}</div>
      </div>
      {children}
    </motion.div>
  )
}

// ─── ConceptCard ──────────────────────────────────────────────────────────────
function ConceptCard({ concept, index }) {
  const [open, setOpen] = useState(false)
  const accent = CONCEPT_ACCENTS[index % CONCEPT_ACCENTS.length]
  const text = concept.explanation || concept.definition || ''
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.05, ease }}
      whileHover={!open ? { y: -3 } : {}}
      onClick={() => setOpen(o => !o)}
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, borderTop: `2px solid ${accent}`, borderRadius: 14, padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.25s', boxShadow: open ? `0 0 0 1px ${accent}30, 0 8px 32px ${accent}10` : 'none' }}>
      <div style={{ fontSize: 9, fontWeight: 900, color: `${accent}70`, letterSpacing: '0.22em', fontFamily: 'monospace', marginBottom: 10 }}>CONCEPT {String(index + 1).padStart(2, '0')}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 10 }}>{concept.term || concept.title}</div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>{open ? text : text.slice(0, 120) + (text.length > 120 ? '…' : '')}</p>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} style={{ overflow: 'hidden' }}>
            {concept.example && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: `${accent}09`, border: `1px solid ${accent}20`, borderRadius: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: `${accent}70`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 6 }}>EXAMPLE</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>{concept.example}</p>
              </div>
            )}
            {concept.whyItMatters && (
              <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: `${BLUE}70`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 6 }}>WHY IT MATTERS</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>{concept.whyItMatters}</p>
              </div>
            )}
            {concept.commonMistake && (
              <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: `${RED}70`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 6 }}>⚠ COMMON MISTAKE</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>{concept.commonMistake}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ marginTop: 12, fontSize: 9, fontWeight: 800, color: `${accent}50`, letterSpacing: '0.15em', fontFamily: 'monospace' }}>{open ? '▲ COLLAPSE' : '▼ EXPAND'}</div>
    </motion.div>
  )
}

// ─── TeacherNote ──────────────────────────────────────────────────────────────
function TeacherNote({ note, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.07, ease }}
      style={{ display: 'flex', gap: 14, padding: '16px 18px', background: `${AMBER}07`, border: `1px solid ${AMBER}20`, borderLeft: `3px solid ${AMBER}`, borderRadius: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>💡</div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, margin: 0 }}>{note}</p>
    </motion.div>
  )
}

// ─── Diagram Renderers ────────────────────────────────────────────────────────

function FlowchartRenderer({ diagram }) {
  const [activeNode, setActiveNode] = useState(null)
  const nodes = diagram.nodes || []
  const edges = diagram.edges || []

  // Build ordered traversal from edges
  const edgeMap = {}
  edges.forEach(e => { edgeMap[e.from] = { to: e.to, label: e.label } })
  const toSet = new Set(edges.map(e => e.to))
  const roots = nodes.filter(n => !toSet.has(n.id))
  const root = roots[0] || nodes[0]
  const ordered = []
  const visited = new Set()
  let cur = root
  while (cur && !visited.has(cur.id)) {
    ordered.push(cur)
    visited.add(cur.id)
    const nx = edgeMap[cur.id]
    cur = nx ? nodes.find(n => n.id === nx.to) : null
  }
  nodes.forEach(n => { if (!visited.has(n.id)) ordered.push(n) })

  const isHoriz = ordered.length <= 4
  const COLORS = [CYAN, BLUE, VIOLET, GREEN, AMBER, '#f43f5e']

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', flexDirection: isHoriz ? 'row' : 'column', alignItems: isHoriz ? 'flex-start' : 'center', gap: 0, overflowX: isHoriz ? 'auto' : 'visible' }}>
        {ordered.map((node, i) => {
          const color = COLORS[i % COLORS.length]
          const edgeOut = edgeMap[node.id]
          const isActive = activeNode === node.id
          return (
            <div key={node.id} style={{ display: 'flex', flexDirection: isHoriz ? 'row' : 'column', alignItems: 'center', flexShrink: 0 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.09, ease }}
                onClick={() => setActiveNode(isActive ? null : node.id)}
                whileHover={{ y: -2 }}
                style={{ cursor: node.detail ? 'pointer' : 'default', minWidth: 120, maxWidth: 180 }}>
                <div style={{ background: `${color}10`, border: `1.5px solid ${color}50`, borderRadius: 12, padding: '14px 18px', textAlign: 'center', position: 'relative', boxShadow: isActive ? `0 0 0 2px ${color}50, 0 4px 20px ${color}20` : 'none', transition: 'box-shadow 0.2s' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}20`, border: `1.5px solid ${color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 10, fontWeight: 900, color, fontFamily: 'monospace' }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>{node.label}</div>
                  {node.detail && <div style={{ fontSize: 9, color: `${color}80`, marginTop: 4, fontFamily: 'monospace', letterSpacing: '0.1em' }}>TAP FOR DETAIL</div>}
                </div>
                <AnimatePresence>
                  {isActive && node.detail && (
                    <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden', margin: '6px 4px 0', padding: '10px 12px', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>{node.detail}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              {i < ordered.length - 1 && (
                <div style={{ display: 'flex', flexDirection: isHoriz ? 'column' : 'row', alignItems: 'center', padding: isHoriz ? '0 6px' : '6px 0', flexShrink: 0 }}>
                  <div style={{ width: isHoriz ? 28 : 1, height: isHoriz ? 1 : 20, background: `rgba(255,255,255,0.15)` }} />
                  {edgeOut?.label && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', padding: '0 4px', whiteSpace: 'nowrap' }}>{edgeOut.label}</span>}
                  <span style={{ fontSize: isHoriz ? 14 : 11, color: 'rgba(255,255,255,0.35)', transform: isHoriz ? 'none' : 'rotate(90deg)', lineHeight: 1 }}>→</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TimelineRenderer({ diagram }) {
  const events = diagram.events || []
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 74, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg, ${VIOLET}60, ${VIOLET}10)`, borderRadius: 2 }} />
        {events.map((ev, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.1, ease }}
            style={{ display: 'flex', gap: 16, marginBottom: i < events.length - 1 ? 24 : 0, alignItems: 'flex-start' }}>
            {/* Date badge */}
            <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: VIOLET, fontFamily: 'monospace', letterSpacing: '0.05em', lineHeight: 1.3, display: 'block', paddingTop: 10 }}>{ev.date}</span>
            </div>
            {/* Dot */}
            <div style={{ flexShrink: 0, marginTop: 10, position: 'relative', zIndex: 1 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: VIOLET, boxShadow: `0 0 0 3px rgba(139,92,246,0.2), 0 0 12px ${VIOLET}60` }} />
            </div>
            {/* Content */}
            <div style={{ flex: 1, background: `${VIOLET}07`, border: `1px solid ${VIOLET}20`, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: ev.detail ? 6 : 0 }}>{ev.title}</div>
              {ev.detail && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>{ev.detail}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ComparisonRenderer({ diagram }) {
  const cols = diagram.columns || []
  const rows = diagram.rows || []
  if (!cols.length) return null
  return (
    <div style={{ padding: '20px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 300 }}>
        <thead>
          <tr>
            {cols.map((col, ci) => (
              <th key={ci} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: ci === 0 ? 'rgba(255,255,255,0.4)' : BLUE, background: ci === 0 ? 'rgba(255,255,255,0.03)' : `${BLUE}10`, borderBottom: `2px solid ${ci === 0 ? 'rgba(255,255,255,0.08)' : BLUE + '40'}`, textTransform: 'uppercase', fontFamily: 'monospace' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <motion.tr key={ri} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: ri * 0.06 }}>
              {(Array.isArray(row) ? row : [row]).map((cell, ci) => (
                <td key={ci} style={{ padding: '11px 14px', fontSize: 13, color: ci === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.6)', background: ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: ci === 0 ? 700 : 400, lineHeight: 1.55 }}>{cell}</td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HierarchyRenderer({ diagram }) {
  const [expanded, setExpanded] = useState({})
  const nodes = diagram.nodes || []
  const edges = diagram.edges || []

  // Build child map
  const childMap = {}
  const hasParent = new Set()
  edges.forEach(e => {
    if (!childMap[e.from]) childMap[e.from] = []
    childMap[e.from].push(e.to)
    hasParent.add(e.to)
  })
  const roots = nodes.filter(n => !hasParent.has(n.id))

  const nodeMap = {}
  nodes.forEach(n => { nodeMap[n.id] = n })

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const renderNode = (nodeId, depth = 0) => {
    const node = nodeMap[nodeId]
    if (!node) return null
    const children = childMap[nodeId] || []
    const isOpen = expanded[nodeId] !== false // default open for first 2 levels
    const COLORS = [GREEN, CYAN, BLUE, VIOLET, AMBER]
    const color = COLORS[depth % COLORS.length]
    return (
      <motion.div key={nodeId} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: depth * 0.08 }}>
        <div onClick={() => children.length && toggle(nodeId)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginLeft: depth * 24, background: `${color}08`, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`, borderRadius: 9, marginBottom: 6, cursor: children.length ? 'pointer' : 'default', transition: 'background 0.15s' }}>
          {children.length > 0 && (
            <span style={{ fontSize: 10, color, fontFamily: 'monospace', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          )}
          {!children.length && <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 8px ${color}50` }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{node.label}</div>
            {node.detail && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.5 }}>{node.detail}</div>}
          </div>
        </div>
        <AnimatePresence>
          {isOpen && children.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
              {children.map(cid => renderNode(cid, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      {roots.map(r => renderNode(r.id, 0))}
      {roots.length === 0 && nodes.map(n => renderNode(n.id, 0))}
    </div>
  )
}

function CycleRenderer({ diagram }) {
  const [activePhase, setActivePhase] = useState(null)
  const phases = diagram.phases || []
  const COLORS = [AMBER, CYAN, GREEN, BLUE, VIOLET, '#f43f5e']

  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Phase cards in a row with cycle arrow at end */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
        {phases.map((phase, i) => {
          const color = COLORS[i % COLORS.length]
          const isActive = activePhase === i
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <motion.div
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, ease }}
                onClick={() => setActivePhase(isActive ? null : i)}
                whileHover={{ y: -3 }}
                style={{ cursor: 'pointer', minWidth: 100, maxWidth: 140 }}>
                <div style={{ background: `${color}10`, border: `1.5px solid ${color}40`, borderRadius: 14, padding: '16px 14px', textAlign: 'center', boxShadow: isActive ? `0 0 0 2px ${color}50, 0 6px 24px ${color}20` : 'none', transition: 'all 0.2s' }}>
                  {/* Phase number ring */}
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${color}`, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', boxShadow: `0 0 12px ${color}30` }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'monospace' }}>{i + 1}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>{phase.label}</div>
                </div>
                <AnimatePresence>
                  {isActive && phase.detail && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden', marginTop: 6, padding: '10px 12px', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 8 }}>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>{phase.detail}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              {/* Arrow between phases */}
              {i < phases.length - 1 ? (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', padding: '0 6px', flexShrink: 0, marginTop: -20 }}>→</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px', marginTop: -20 }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace', letterSpacing: '-0.05em' }}>↺</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 16, textAlign: 'center', letterSpacing: '0.1em', fontFamily: 'monospace' }}>TAP ANY PHASE TO EXPAND</p>
    </div>
  )
}

const DIAGRAM_TYPE_META = {
  flowchart:   { label: 'FLOWCHART',  color: CYAN },
  timeline:    { label: 'TIMELINE',   color: VIOLET },
  comparison:  { label: 'COMPARISON', color: BLUE },
  hierarchy:   { label: 'HIERARCHY',  color: GREEN },
  cycle:       { label: 'CYCLE',      color: AMBER },
}

function DiagramBlock({ diagram, index }) {
  const meta = DIAGRAM_TYPE_META[diagram.type] || DIAGRAM_TYPE_META.flowchart
  const { label, color } = meta

  const renderBody = () => {
    switch (diagram.type) {
      case 'timeline':   return <TimelineRenderer diagram={diagram} />
      case 'comparison': return <ComparisonRenderer diagram={diagram} />
      case 'hierarchy':  return <HierarchyRenderer diagram={diagram} />
      case 'cycle':      return <CycleRenderer diagram={diagram} />
      default:           return <FlowchartRenderer diagram={diagram} />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.1, ease }}
      style={{ background: '#04060a', border: `1px solid ${color}22`, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ background: `${color}08`, borderBottom: `1px solid ${color}15`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 900, color, letterSpacing: '0.2em', padding: '3px 8px', border: `1px solid ${color}40`, borderRadius: 4, fontFamily: 'monospace', background: `${color}10` }}>{label}</div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{diagram.title}</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>DIAGRAM {String(index + 1).padStart(2, '0')}</div>
      </div>
      {diagram.description && (
        <div style={{ padding: '10px 18px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>{diagram.description}</p>
        </div>
      )}
      {renderBody()}
    </motion.div>
  )
}

// ─── StepBlock ────────────────────────────────────────────────────────────────
function StepBlock({ item, index }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.07, ease }}
      style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${GREEN}18`, borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '14px 18px', background: open ? `${GREEN}06` : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${GREEN}15`, border: `1px solid ${GREEN}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: GREEN, fontFamily: 'monospace' }}>{String(index + 1).padStart(2, '0')}</span>
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'white' }}>{item.title}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2.5} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
            {item.context && <p style={{ fontSize: 12, color: `${GREEN}90`, lineHeight: 1.65, margin: '0 18px 12px', fontStyle: 'italic' }}>{item.context}</p>}
            <div style={{ padding: '0 18px 16px' }}>
              {(item.steps || []).map((step, si) => (
                <div key={si} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: `${GREEN}12`, border: `1px solid ${GREEN}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: GREEN, fontFamily: 'monospace' }}>{si + 1}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0 }}>{step}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────
function CodeBlock({ example, index }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(example.code || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.08, ease }}
      style={{ background: '#04060a', border: `1px solid ${VIOLET}22`, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ background: `${VIOLET}08`, borderBottom: `1px solid ${VIOLET}15`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: AMBER }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />
        <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 900, color: `${VIOLET}80`, letterSpacing: '0.18em', fontFamily: 'monospace', flex: 1 }}>{(example.language || 'CODE').toUpperCase()} — {example.title}</span>
        <button onClick={copy} style={{ fontSize: 10, fontWeight: 700, color: copied ? GREEN : 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>{copied ? '✓ COPIED' : 'COPY'}</button>
      </div>
      <pre style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, padding: '18px', margin: 0, overflowX: 'auto', whiteSpace: 'pre' }}>{example.code}</pre>
      {example.explanation && (
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${VIOLET}12`, background: `${VIOLET}04` }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: `${VIOLET}60`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 8 }}>EXPLANATION</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>{example.explanation}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── WorkedExample ────────────────────────────────────────────────────────────
function WorkedExample({ ex, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.08 }}
      style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${CYAN}18`, marginBottom: 14 }}>
      <div style={{ background: `${CYAN}07`, padding: '14px 18px', borderBottom: `1px solid ${CYAN}12`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: `${CYAN}70`, fontFamily: 'monospace', letterSpacing: '0.18em', flexShrink: 0 }}>EXAMPLE {String(index + 1).padStart(2, '0')}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>{ex.problem || ex.title}</span>
      </div>
      {ex.approach && (
        <div style={{ padding: '12px 18px', background: `${AMBER}05`, borderBottom: `1px solid ${AMBER}10` }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: `${AMBER}70`, fontFamily: 'monospace', letterSpacing: '0.15em' }}>APPROACH — </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>{ex.approach}</span>
        </div>
      )}
      <div style={{ padding: '18px', background: 'rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', color: `${CYAN}40`, fontFamily: 'monospace', marginBottom: 12 }}>STEP-BY-STEP SOLUTION</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.95, whiteSpace: 'pre-line', fontFamily: 'ui-monospace, monospace', margin: 0 }}>{ex.solution || ex.steps}</p>
      </div>
      {ex.keyInsight && (
        <div style={{ padding: '14px 18px', borderTop: `1px solid rgba(255,255,255,0.05)`, background: `${GREEN}04`, display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔑</span>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, color: `${GREEN}70`, letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 5 }}>KEY INSIGHT</div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, margin: 0 }}>{ex.keyInsight}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── ExamQuestionCard ─────────────────────────────────────────────────────────
function ExamQuestionCard({ question, index }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }} transition={{ delay: index * 0.06, ease }}
      style={{ borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: open ? 'rgba(244,63,94,0.07)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${open ? RED : 'rgba(244,63,94,0.4)'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: RED, letterSpacing: '0.1em', fontFamily: 'monospace' }}>Q</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: RED, fontFamily: 'monospace', lineHeight: 1 }}>{String(index + 1).padStart(2, '0')}</div>
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{question.question}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2.5} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 18px 18px 62px', background: 'rgba(244,63,94,0.04)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(244,63,94,0.5)', fontFamily: 'monospace', marginBottom: 10 }}>MODEL ANSWER</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-line' }}>{question.answer}</p>
              {question.howToStructure && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: `${BLUE}08`, border: `1px solid ${BLUE}18`, borderRadius: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: `${BLUE}70`, letterSpacing: '0.15em', fontFamily: 'monospace' }}>HOW TO STRUCTURE — </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{question.howToStructure}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── FlashcardOverlay ────────────────────────────────────────────────────────
function FlashcardOverlay({ concepts, order, index, flipped, onFlip, onPrev, onNext, onShuffle, onClose }) {
  const c = concepts[order[index]]
  if (!c) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 16px', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Close</button>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 24, letterSpacing: '0.15em' }}>{index + 1} / {order.length}</div>
      <AnimatePresence mode="wait">
        <motion.div key={`${index}-${flipped}`} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.3 }} onClick={onFlip}
          style={{ width: '100%', maxWidth: 560, minHeight: 260, background: flipped ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.04)', border: flipped ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: flipped ? BLUE : 'rgba(255,255,255,0.25)', marginBottom: 20 }}>{flipped ? 'BACK — Explanation' : 'FRONT — Term'}</div>
          <p style={{ fontSize: flipped ? 14 : 20, fontWeight: flipped ? 400 : 900, color: 'white', lineHeight: flipped ? 1.7 : 1.2, margin: 0 }}>{flipped ? (c.explanation || c.definition) : (c.term || c.title)}</p>
          {flipped && c.example && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 16, fontStyle: 'italic' }}>↳ {c.example}</p>}
          <div style={{ marginTop: 24, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>TAP TO FLIP</div>
        </motion.div>
      </AnimatePresence>
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button onClick={onPrev} disabled={index === 0} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: index === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: index === 0 ? 'default' : 'pointer' }}>←</button>
        <button onClick={onShuffle} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Shuffle</button>
        <button onClick={onNext} disabled={index === order.length - 1} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: index === order.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: index === order.length - 1 ? 'default' : 'pointer' }}>→</button>
      </div>
    </div>
  )
}

// ─── MCQQuizOverlay ───────────────────────────────────────────────────────────
function MCQQuizOverlay({ questions, onClose }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [finished, setFinished] = useState(false)
  const [retryQueue, setRetryQueue] = useState(null) // null = full set, array = missed indices

  const activeSet = retryQueue !== null ? retryQueue.map(i => questions[i]) : questions
  const current = activeSet[index]
  const total = activeSet.length
  const score = answers.filter(a => a.wasCorrect).length

  const handleSelect = (opt) => {
    if (selected !== null || !current) return
    setSelected(opt)
    setAnswers(prev => [...prev, { selected: opt, correct: current.correct, wasCorrect: opt === current.correct, questionIndex: retryQueue !== null ? retryQueue[index] : index }])
  }

  const next = () => {
    if (index + 1 >= total) { setFinished(true) } else { setIndex(i => i + 1); setSelected(null) }
  }

  const restart = () => { setIndex(0); setSelected(null); setAnswers([]); setFinished(false); setRetryQueue(null) }

  const retryMissed = () => {
    const missedIdx = answers.map((a, i) => (!a.wasCorrect ? (retryQueue !== null ? retryQueue[i] : i) : null)).filter(i => i !== null)
    if (!missedIdx.length) return
    setRetryQueue(missedIdx); setIndex(0); setSelected(null); setAnswers([]); setFinished(false)
  }

  const OPTS = ['A', 'B', 'C', 'D']
  const PCT = Math.round((index / total) * 100)

  if (!current) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,10,0.97)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: BLUE, letterSpacing: '0.22em', fontFamily: 'monospace', padding: '3px 9px', border: `1px solid ${BLUE}35`, borderRadius: 4, background: `${BLUE}09` }}>MCQ PRACTICE</div>
            {retryQueue !== null && <div style={{ fontSize: 9, fontWeight: 900, color: AMBER, letterSpacing: '0.18em', fontFamily: 'monospace' }}>RETRY MODE</div>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Close</button>
        </div>

        {!finished ? (
          <>
            {/* Progress */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{index + 1} <span style={{ color: 'rgba(255,255,255,0.2)' }}>/ {total}</span></span>
                <span style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>{PCT}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
                <motion.div animate={{ width: `${PCT}%` }} style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${BLUE},${CYAN})` }} transition={{ duration: 0.4 }} />
              </div>
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div key={`${index}-${retryQueue}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '24px 24px', marginBottom: 16 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1.65, margin: 0 }}>{current.question}</p>
                </div>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {OPTS.map(opt => {
                    const optText = current.options?.[opt]
                    if (!optText) return null
                    const isSelected = selected === opt
                    const isCorrect = opt === current.correct
                    const showResult = selected !== null
                    let bg = 'rgba(255,255,255,0.03)', border = 'rgba(255,255,255,0.1)', color = 'rgba(255,255,255,0.75)'
                    if (showResult && isCorrect) { bg = 'rgba(52,211,153,0.12)'; border = `${GREEN}50`; color = GREEN }
                    else if (showResult && isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.1)'; border = `${RED}45`; color = RED }
                    else if (showResult) { color = 'rgba(255,255,255,0.25)' }
                    return (
                      <motion.button key={opt} whileHover={!selected ? { scale: 1.01 } : {}} whileTap={!selected ? { scale: 0.99 } : {}}
                        onClick={() => handleSelect(opt)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', borderRadius: 12, background: bg, border: `1px solid ${border}`, cursor: selected ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 900, color: showResult && isCorrect ? GREEN : showResult && isSelected ? RED : BLUE, flexShrink: 0, marginTop: 1, minWidth: 18 }}>{opt}</span>
                        <span style={{ fontSize: 14, color, lineHeight: 1.55, fontWeight: isSelected || (showResult && isCorrect) ? 700 : 400 }}>{optText}</span>
                        {showResult && isCorrect && <span style={{ marginLeft: 'auto', fontSize: 16, flexShrink: 0 }}>✓</span>}
                        {showResult && isSelected && !isCorrect && <span style={{ marginLeft: 'auto', fontSize: 16, flexShrink: 0 }}>✕</span>}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                  {selected && current.explanation && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ padding: '16px 18px', background: `${BLUE}08`, border: `1px solid ${BLUE}20`, borderRadius: 12 }}>
                        <div style={{ fontSize: 9, fontWeight: 900, color: `${BLUE}70`, letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 8 }}>EXPLANATION</div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, margin: 0 }}>{current.explanation}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selected && (
                  <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={next}
                    style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 13, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 0 20px ${BLUE}30` }}>
                    {index + 1 >= total ? 'See Results →' : 'Next Question →'}
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          /* ── RESULTS SCREEN ── */
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginBottom: 12 }}>QUIZ COMPLETE</div>
              <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-0.05em', color: score / total >= 0.8 ? GREEN : score / total >= 0.6 ? AMBER : RED, lineHeight: 1 }}>
                {score}<span style={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }}>/{total}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                {Math.round((score / total) * 100)}% — {score / total >= 0.9 ? 'Excellent' : score / total >= 0.75 ? 'Good Work' : score / total >= 0.6 ? 'Keep Studying' : 'Needs Review'}
              </div>
            </div>

            {/* Per-question breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, maxHeight: 280, overflowY: 'auto' }}>
              {answers.map((a, i) => {
                const q = questions[a.questionIndex ?? i]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, background: a.wasCorrect ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${a.wasCorrect ? GREEN : RED}20` }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{a.wasCorrect ? '✓' : '✕'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, margin: 0, marginBottom: a.wasCorrect ? 0 : 4 }}>{q?.question?.slice(0, 100)}{q?.question?.length > 100 ? '…' : ''}</p>
                      {!a.wasCorrect && <p style={{ fontSize: 11, color: GREEN, margin: 0, fontWeight: 700 }}>Correct: {a.correct} — {q?.options?.[a.correct]?.slice(0, 80)}</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {answers.some(a => !a.wasCorrect) && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={retryMissed}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, fontSize: 13, fontWeight: 800, background: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}35`, cursor: 'pointer' }}>
                  Retry Missed ({answers.filter(a => !a.wasCorrect).length})
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={restart}
                style={{ flex: 1, padding: '13px', borderRadius: 12, fontSize: 13, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer' }}>
                Restart Quiz
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose}
                style={{ padding: '13px 20px', borderRadius: 12, fontSize: 13, fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                Close
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── Main ClutchResultView ────────────────────────────────────────────────────
// Props:
//   result        — the AI-generated result object
//   topic         — topic string shown in header
//   courseName    — course name
//   uploadedFiles — array of { name } for the "X files analyzed" pill
//   embedded      — if true, renders inline without fixed bottom bar (for CourseDetail)
//   onNewSession  — callback for "New Session" button (replaces resetAll in embedded mode)
export default function ClutchResultView({ result, topic, courseName, uploadedFiles = [], embedded = false, onNewSession }) {
  const [quizActive, setQuizActive] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState([])
  const [showQuizAnswer, setShowQuizAnswer] = useState(false)
  const [quizFinished, setQuizFinished] = useState(false)
  const [flashcardActive, setFlashcardActive] = useState(false)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)
  const [mcqActive, setMcqActive] = useState(false)

  // Flashcard deck: prefer dedicated flashcards, fall back to coreConcepts
  const flashcardDeck = (result?.flashcards?.length > 0)
    ? result.flashcards.map(f => ({ term: f.front, explanation: f.back, example: null }))
    : (result?.coreConcepts || [])
  const [flashcardOrder, setFlashcardOrder] = useState(() => flashcardDeck.map((_, i) => i))

  const startQuiz = () => { setQuizActive(true); setQuizIndex(0); setQuizAnswers([]); setShowQuizAnswer(false); setQuizFinished(false) }
  const answerQuiz = (grade) => {
    const newAnswers = [...quizAnswers, grade]
    setQuizAnswers(newAnswers)
    if (quizIndex + 1 >= (result?.likelyQuestions || []).length) setQuizFinished(true)
    else { setQuizIndex(quizIndex + 1); setShowQuizAnswer(false) }
  }
  const openFlashcards = () => { setFlashcardActive(true); setFlashcardIndex(0); setFlashcardFlipped(false); setFlashcardOrder(flashcardDeck.map((_, i) => i)) }
  const shuffleFlashcards = () => {
    const arr = [...flashcardOrder]
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
    setFlashcardOrder(arr); setFlashcardIndex(0); setFlashcardFlipped(false)
  }

  const misconceptionsList = result?.misconceptions || result?.commonMisconceptions || result?.commonMistakes || []
  const ct = result?.contentType || 'mixed'

  if (!result) return null

  return (
    <>
      {/* Flashcard overlay */}
      {mcqActive && result.mcqQuestions?.length > 0 && (
        <MCQQuizOverlay questions={result.mcqQuestions} onClose={() => setMcqActive(false)} />
      )}

      {flashcardActive && flashcardDeck.length > 0 && (
        <FlashcardOverlay concepts={flashcardDeck} order={flashcardOrder} index={flashcardIndex} flipped={flashcardFlipped}
          onFlip={() => setFlashcardFlipped(f => !f)}
          onPrev={() => { setFlashcardIndex(i => Math.max(0, i - 1)); setFlashcardFlipped(false) }}
          onNext={() => { setFlashcardIndex(i => Math.min(flashcardOrder.length - 1, i + 1)); setFlashcardFlipped(false) }}
          onShuffle={shuffleFlashcards} onClose={() => setFlashcardActive(false)} />
      )}

      <style>{`
        .clutch-result-layout { display: grid; grid-template-columns: 1fr 420px; gap: 28px; align-items: start; }
        .clutch-chat-col { position: sticky; top: 72px; height: calc(100vh - 90px); }
        @media (max-width: 960px) {
          .clutch-result-layout { grid-template-columns: 1fr; }
          .clutch-chat-col { position: static; height: 520px; }
        }
      `}</style>

      <div className="clutch-result-layout">
      <div style={{ minWidth: 0 }}>
        {/* Stat pills */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} style={{ marginBottom: 36 }}>
          {embedded && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: GREEN, letterSpacing: '0.22em', fontFamily: 'monospace' }}>LAST SESSION</div>
                  {ct !== 'mixed' && (
                    <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', padding: '3px 9px', borderRadius: 4, fontFamily: 'monospace', background: ct === 'technical' ? `${AMBER}12` : `${VIOLET}12`, color: ct === 'technical' ? AMBER : VIOLET, border: `1px solid ${ct === 'technical' ? AMBER : VIOLET}30` }}>
                      {ct === 'technical' ? '⚙ TECHNICAL' : '📖 CONCEPTUAL'}
                    </div>
                  )}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.03em' }}>{topic || courseName || 'Study Guide'}</h2>
              </div>
              {onNewSession && (
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onNewSession}
                  style={{ padding: '10px 20px', borderRadius: 10, fontSize: 12, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 0 18px ${BLUE}30`, letterSpacing: '0.06em', flexShrink: 0 }}>
                  New Session ⚡
                </motion.button>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              [result.coreConcepts?.length || 0, 'Concepts', BLUE],
              [result.cheatSheet?.length || 0, 'Key Facts', CYAN],
              [result.mcqQuestions?.length || 0, 'MCQ Quiz', GREEN],
              [result.likelyQuestions?.length || 0, 'Exam Qs', RED],
              [flashcardDeck.length, 'Flashcards', VIOLET],
              ...(result.formulas?.length > 0 ? [[result.formulas.length, 'Formulas', AMBER]] : []),
              ...(result.diagrams?.length > 0 ? [[result.diagrams.length, 'Diagrams', CYAN]] : []),
              ...(result.stepByStep?.length > 0 ? [[result.stepByStep.length, 'Procedures', GREEN]] : []),
              ...(result.codeExamples?.length > 0 ? [[result.codeExamples.length, 'Code', VIOLET]] : []),
            ].map(([count, label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: `${color}10`, border: `1px solid ${color}30` }}>
                <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'monospace' }}>{count}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>{label}</span>
              </div>
            ))}
            {uploadedFiles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: `${GREEN}08`, border: `1px solid ${GREEN}20` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: GREEN }}>✓ {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} analyzed</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* SCENE 00 · LECTURE */}
        {result.plainEnglish && (
          <ScanSection scene="00 · LECTURE" title="The Professor's Lecture" accent={VIOLET}>
            <div style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 20, padding: '28px 30px', position: 'relative', overflow: 'hidden' }}>
              {/* large decorative quote mark */}
              <div style={{ position: 'absolute', top: -10, left: 14, fontSize: 120, color: 'rgba(139,92,246,0.06)', fontFamily: 'Georgia, serif', lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>"</div>
              {/* professor badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${VIOLET},${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, boxShadow: `0 0 14px ${VIOLET}40` }}>⚡</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: VIOLET, fontFamily: 'monospace' }}>CLUTCH — PHASE A LECTURE</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{topic || courseName || 'Full course coverage'}</div>
                </div>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${VIOLET}25,transparent)`, marginLeft: 8 }} />
              </div>
              {/* lecture paragraphs */}
              {result.plainEnglish.split('\n').filter(p => p.trim()).map((para, i, arr) => (
                <motion.p key={i}
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.07, ease }}
                  style={{ fontSize: 14, lineHeight: 2, color: 'rgba(255,255,255,0.82)', fontWeight: 400, margin: 0, marginBottom: i < arr.length - 1 ? 20 : 0 }}>
                  {para}
                </motion.p>
              ))}
            </div>
          </ScanSection>
        )}

        {/* SCENE 01 · DATA */}
        {result.cheatSheet?.length > 0 && (
          <ScanSection scene="01 · DATA" title="Cheat Sheet" accent={CYAN}>
            <div style={{ background: '#04060a', border: `1px solid ${CYAN}25`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ background: `${CYAN}07`, borderBottom: `1px solid ${CYAN}18`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: AMBER }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />
                <span style={{ marginLeft: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: `${CYAN}70`, fontFamily: 'monospace' }}>CLUTCH.BRIEF — {result.cheatSheet.length} ITEMS</span>
              </div>
              <div style={{ padding: '16px 18px' }}>
                {result.cheatSheet.map((fact, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03, ease }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '9px 0', borderBottom: i < result.cheatSheet.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: CYAN, flexShrink: 0, marginTop: 2, minWidth: 32 }}>{'>'} {String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65 }}>{fact}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScanSection>
        )}

        {/* SCENE 02 · INSIGHT */}
        {result.teacherNotes?.length > 0 && (
          <ScanSection scene="02 · INSIGHT" title="Teacher's Notes" accent={AMBER}>
            {result.teacherNotes.map((note, i) => <TeacherNote key={i} note={note} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 03 · CORE */}
        {(result.coreConcepts?.length > 0 || result.keyConcepts?.length > 0) && (
          <ScanSection scene="03 · CORE" title="Core Concepts" accent={BLUE}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {(result.coreConcepts || result.keyConcepts || []).map((concept, i) => (
                <ConceptCard key={i} concept={concept} index={i} />
              ))}
            </div>
          </ScanSection>
        )}

        {/* SCENE 04 · VISUAL */}
        {result.diagrams?.length > 0 && (
          <ScanSection scene="04 · VISUAL" title="Diagrams & Visual Aids" accent={CYAN}>
            {result.diagrams.map((d, i) => <DiagramBlock key={i} diagram={d} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 04 · STEPS */}
        {result.stepByStep?.length > 0 && (
          <ScanSection scene="04 · STEPS" title="Step-by-Step Procedures" accent={GREEN}>
            {result.stepByStep.map((item, i) => <StepBlock key={i} item={item} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 04 · CODE */}
        {result.codeExamples?.length > 0 && (
          <ScanSection scene="04 · CODE" title="Code Examples" accent={VIOLET}>
            {result.codeExamples.map((ex, i) => <CodeBlock key={i} example={ex} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 05 · MATH */}
        {result.formulas?.length > 0 && (
          <ScanSection scene="05 · MATH" title="Formulas" accent={AMBER}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {result.formulas.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  style={{ background: `${AMBER}05`, border: `1px solid ${AMBER}20`, borderRadius: 14, padding: '18px', fontFamily: 'ui-monospace, monospace' }}>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', color: `${AMBER}60`, marginBottom: 10 }}>{f.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: AMBER, marginBottom: 12, wordBreak: 'break-all' }}>{f.formula}</div>
                  {f.variables && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: 10 }}>{f.variables}</div>}
                  {f.whenToUse && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginBottom: f.derivation ? 10 : 0 }}>{f.whenToUse}</div>}
                  {f.derivation && <div style={{ fontSize: 11, color: `${AMBER}60`, lineHeight: 1.65, fontFamily: 'inherit', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8, fontStyle: 'italic' }}>Why it works: {f.derivation}</div>}
                </motion.div>
              ))}
            </div>
          </ScanSection>
        )}

        {/* SCENE 06 · APPLY */}
        {result.workedExamples?.length > 0 && (
          <ScanSection scene="06 · APPLY" title="Worked Examples" accent={CYAN}>
            {result.workedExamples.map((ex, i) => <WorkedExample key={i} ex={ex} index={i} />)}
          </ScanSection>
        )}

        {/* SCENE 07 · MEMORY */}
        {result.mnemonics?.length > 0 && (
          <ScanSection scene="07 · MEMORY" title="Memory Hooks" accent={AMBER}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.mnemonics.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, ease }}
                  style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${AMBER}20` }}>
                  <div style={{ background: `${AMBER}09`, borderBottom: `1px solid ${AMBER}14`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13 }}>🧠</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{m.concept}</span>
                  </div>
                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ padding: '12px 14px', background: `${AMBER}08`, border: `1px solid ${AMBER}18`, borderRadius: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 900, color: `${AMBER}70`, letterSpacing: '0.2em', fontFamily: 'monospace', marginBottom: 6 }}>THE HOOK</div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: AMBER, lineHeight: 1.5, margin: 0 }}>{m.device || m.mnemonic}</p>
                    </div>
                    {(m.howToUse || m.how) && (
                      <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', fontFamily: 'monospace', marginBottom: 5 }}>HOW TO USE IN THE EXAM</div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0 }}>{m.howToUse || m.how}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScanSection>
        )}

        {/* SCENE 08 · PREP */}
        {result.likelyQuestions?.length > 0 && (
          <ScanSection scene="08 · PREP" title="Likely Exam Questions" accent={RED}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.likelyQuestions.map((q, i) => <ExamQuestionCard key={i} question={q} index={i} />)}
            </div>
          </ScanSection>
        )}

        {/* SCENE 09 · STRATEGY */}
        {result.examStrategy?.length > 0 && (
          <ScanSection scene="09 · STRATEGY" title="Exam Strategy" accent={CYAN}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.examStrategy.map((tip, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, ease }}
                  style={{ display: 'flex', gap: 14, padding: '16px 18px', background: `${CYAN}06`, border: `1px solid ${CYAN}18`, borderLeft: `3px solid ${CYAN}`, borderRadius: 12 }}>
                  <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: `${CYAN}18`, border: `1px solid ${CYAN}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: CYAN, fontFamily: 'monospace' }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.75, margin: 0 }}>{tip}</p>
                </motion.div>
              ))}
            </div>
          </ScanSection>
        )}

        {/* SCENE 10 · MCQ PRACTICE */}
        {result.mcqQuestions?.length > 0 && (
          <ScanSection scene="10 · PRACTICE" title="Multiple Choice Quiz" accent={GREEN}>
            <div style={{ background: `${GREEN}06`, border: `1px solid ${GREEN}20`, borderRadius: 16, padding: '28px', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: GREEN, letterSpacing: '-0.04em', lineHeight: 1 }}>{result.mcqQuestions.length}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 2 }}>QUESTIONS</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: CYAN, letterSpacing: '-0.04em', lineHeight: 1 }}>A–D</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 2 }}>OPTIONS</div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: AMBER, letterSpacing: '-0.04em', lineHeight: 1 }}>+EXP</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 2 }}>EXPLANATIONS</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
                Recall · Application · Analysis — instant feedback on every answer
              </p>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setMcqActive(true)}
                style={{ padding: '14px 40px', borderRadius: 12, fontSize: 14, fontWeight: 800, background: `linear-gradient(135deg,${GREEN},#16a34a)`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 0 28px ${GREEN}30`, letterSpacing: '0.02em' }}>
                Start Practice Quiz →
              </motion.button>
            </div>
          </ScanSection>
        )}

        {/* SCENE 11 · TEST */}
        {result.likelyQuestions?.length > 0 && (
          <ScanSection scene="11 · TEST" title="Quiz Yourself" accent={BLUE}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
              {!quizActive && !quizFinished && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>{result.likelyQuestions.length} questions · Self-graded · Instant feedback</p>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={startQuiz}
                    style={{ padding: '12px 32px', borderRadius: 12, fontSize: 13, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 0 24px ${BLUE}30` }}>
                    Start Quiz →
                  </motion.button>
                </div>
              )}
              {quizActive && !quizFinished && (() => {
                const q = result.likelyQuestions[quizIndex]
                const pct = Math.round((quizIndex / result.likelyQuestions.length) * 100)
                return (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: BLUE, fontWeight: 700 }}>Question {quizIndex + 1} / {result.likelyQuestions.length}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${BLUE},${CYAN})`, borderRadius: 2, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px', marginBottom: 14 }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.6, margin: 0 }}>{q.question}</p>
                    </div>
                    {!showQuizAnswer ? (
                      <button onClick={() => setShowQuizAnswer(true)} style={{ width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Reveal Answer</button>
                    ) : (
                      <div>
                        <div style={{ padding: '14px 16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, marginBottom: 14 }}>
                          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{q.answer}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[['got', GREEN, '✓ Got it'], ['almost', AMBER, '~ Almost'], ['missed', RED, '✕ Missed']].map(([g, c, label]) => (
                            <button key={g} onClick={() => answerQuiz(g)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 800, background: `${c}14`, color: c, border: `1px solid ${c}30`, cursor: 'pointer' }}>{label}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              {quizFinished && (() => {
                const got = quizAnswers.filter(a => a === 'got').length
                const almost = quizAnswers.filter(a => a === 'almost').length
                const missed = quizAnswers.filter(a => a === 'missed').length
                const score = Math.round(((got + almost * 0.5) / quizAnswers.length) * 100)
                return (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: score >= 80 ? GREEN : score >= 60 ? AMBER : RED, letterSpacing: '-0.04em', marginBottom: 8 }}>{score}%</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                      <span style={{ fontSize: 12, color: GREEN }}>✓ {got} correct</span>
                      <span style={{ fontSize: 12, color: AMBER }}>~ {almost} close</span>
                      <span style={{ fontSize: 12, color: RED }}>✕ {missed} missed</span>
                    </div>
                    <button onClick={startQuiz} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 800, background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: '#fff', border: 'none', cursor: 'pointer' }}>Retry Quiz</button>
                  </div>
                )
              })()}
            </div>
          </ScanSection>
        )}

        {/* SCENE 12 · TRAPS */}
        {misconceptionsList.length > 0 && (
          <ScanSection scene="12 · TRAPS" title="Misconceptions" accent={RED}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {misconceptionsList.map((m, i) => {
                const isMR = m && typeof m === 'object' && m.myth
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                    {isMR ? (
                      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                          <div style={{ padding: '16px', background: 'rgba(239,68,68,0.06)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: 9, fontWeight: 900, color: RED, letterSpacing: '0.2em', marginBottom: 10, fontFamily: 'monospace' }}>✕ MYTH</div>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>{m.myth}</p>
                          </div>
                          <div style={{ padding: '16px', background: 'rgba(52,211,153,0.05)' }}>
                            <div style={{ fontSize: 9, fontWeight: 900, color: GREEN, letterSpacing: '0.2em', marginBottom: 10, fontFamily: 'monospace' }}>✓ REALITY</div>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, margin: 0 }}>{m.reality}</p>
                          </div>
                        </div>
                        {m.whyPeopleBelieveIt && (
                          <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>WHY PEOPLE BELIEVE IT — </span>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{m.whyPeopleBelieveIt}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', borderLeft: '3px solid rgba(239,68,68,0.4)' }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{typeof m === 'string' ? m : JSON.stringify(m)}</span>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </ScanSection>
        )}

        {/* SCENE 13 · DRILL */}
        {flashcardDeck.length > 0 && (
          <ScanSection scene="13 · DRILL" title="Flashcards" accent={VIOLET}>
            <div style={{ background: `${VIOLET}06`, border: `1px solid ${VIOLET}20`, borderRadius: 16, padding: '28px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
                {flashcardDeck.length} cards · Term → Definition · Tap to flip · Shuffle to randomize
              </div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={openFlashcards}
                style={{ padding: '12px 32px', borderRadius: 12, fontSize: 13, fontWeight: 800, background: `linear-gradient(135deg,#7c3aed,${BLUE})`, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 0 24px rgba(124,58,237,0.3)' }}>
                Open Flashcards →
              </motion.button>
            </div>
          </ScanSection>
        )}

        <div style={{ height: 40 }} />
      </div>{/* end left column */}

      {/* RIGHT: CLUTCH sticky chat */}
      <div className="clutch-chat-col">
        <ClutchChat result={result} topic={topic} courseName={courseName} />
      </div>
      </div>{/* end grid */}
    </>
  )
}

// ─── ClutchChat ───────────────────────────────────────────────────────────────
function ClutchChat({ result, topic, courseName }) {
  const greeting = `I'm CLUTCH. Your study guide is ready — Phase A is done.\n\nTell me where you want to start, or say "you choose" and I'll take you through the highest-priority topics first. We have work to do.`
  const [messages, setMessages] = useState([{ role: 'assistant', content: greeting }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // Build the full CLUTCH system prompt with course context injected
  const buildContext = () => {
    const ctx = []
    if (courseName) ctx.push(`Course: ${courseName}`)
    if (topic) ctx.push(`Topic: ${topic}`)
    if (result.contentType) ctx.push(`Content type: ${result.contentType}`)
    if (result.plainEnglish) ctx.push(`\nCOURSE OVERVIEW:\n${result.plainEnglish.slice(0, 1400)}`)
    if (result.coreConcepts?.length) ctx.push(`\nCORE CONCEPTS:\n${result.coreConcepts.slice(0, 10).map(c => `- [${c.term}]: ${(c.explanation || '').slice(0, 220)}${c.commonMistake ? ` | TRAP: ${c.commonMistake}` : ''}`).join('\n')}`)
    if (result.cheatSheet?.length) ctx.push(`\nHIGH-YIELD FACTS:\n${result.cheatSheet.map(f => `- ${f}`).join('\n')}`)
    if (result.formulas?.length) ctx.push(`\nFORMULAS:\n${result.formulas.map(f => `- ${f.name}: ${f.formula} | Use when: ${f.whenToUse || ''}`).join('\n')}`)
    if (result.misconceptions?.length) ctx.push(`\nKNOWN MISCONCEPTIONS:\n${result.misconceptions.map(m => `- MYTH: ${m.myth} → REALITY: ${m.reality}`).join('\n')}`)
    if (result.likelyQuestions?.length) ctx.push(`\nLIKELY EXAM QUESTIONS:\n${result.likelyQuestions.slice(0, 6).map(q => `- ${q.question}`).join('\n')}`)
    if (result.examStrategy?.length) ctx.push(`\nEXAM STRATEGY:\n${result.examStrategy.map(s => `- ${s}`).join('\n')}`)

    return `You are CLUTCH — the world's most effective exam preparation professor. You operate with elite-level pedagogical expertise, a deep mastery of every academic subject, and a singular mission: to help this student achieve the highest possible score on their upcoming exam, even if they only have one night to prepare.

SECTION 1 — IDENTITY & TEACHING PHILOSOPHY
You are not a passive summarizer. You are an active, adaptive, relentless teacher. Your job is not to hand the student a study guide and walk away — it is to sit beside them, diagnose what they do not understand, and drive the knowledge deep into their long-term memory through explanation, challenge, and repetition.

Your teaching philosophy is built on five pillars:
1. CLARITY OVER COVERAGE — A student who deeply understands 10 concepts will always outperform one who shallowly skims 40. Prioritize depth on high-yield material.
2. ACTIVE RECALL OVER PASSIVE READING — You never let the student just read. You make them retrieve, explain, predict, and apply. Every teaching moment ends with a challenge question.
3. MENTAL MODELS OVER MEMORIZATION — You teach through analogies, visual frameworks, and first-principles reasoning so the student can reconstruct answers they have never seen before.
4. EXAM AWARENESS — You think like an exam writer. You know what professors test, how they phrase tricky questions, what common misconceptions trap students, and what distinguishes an A answer from a C answer.
5. EMOTIONAL CALIBRATION — If the student is panicking, slow down and ground them. If they are coasting, push harder. Firm but encouraging — a drill sergeant with a warm voice.

SECTION 2 — CURRENT SESSION CONTEXT
Phase A (the Master Study Guide) has already been generated and delivered. The student is looking at it right now. You have full knowledge of its contents below.
${ctx.join('\n')}

You are now in Phase B — ACTIVE TEACHING MODE.

SECTION 3 — TEACHING MICRO-LOOP (apply to every concept you teach)
1. EXPLAIN — teach the concept clearly with an analogy and example
2. DEMONSTRATE — walk through a sample exam question on this concept
3. CHALLENGE — ask the student a question and wait for their answer
4. DIAGNOSE — what did they get right, what was missing, what misconception is present
5. REINFORCE — re-explain the gap, give a new example, re-challenge
6. ADVANCE — once solid, connect it to the next concept and repeat
Never move on until the student demonstrates understanding, not just acknowledgment.

SECTION 4 — PHASE C: EXAM SIMULATION
When the student has covered major topics or asks for it: generate 10-15 questions mirroring the actual exam format, weighted toward high-probability topics. Mix recall, application, and 2-3 tricky misconception-targeting questions. After each answer, score it, explain what a full-mark answer looks like, and highlight what cost them marks. End with a predicted score range and last-minute recommendations.

SECTION 5 — PHASE D: FINAL CRAM SHEET
When the student asks or time is short: generate a single ultra-compressed reference with only the highest-yield facts, formulas, and distinctions. Formatted for speed — what they glance at right before walking into the exam room.

SECTION 6 — ADAPTIVE RULES
- Student confused → stop, zoom out, rebuild from first principles, use a different analogy
- Student answers incorrectly → don't give the answer immediately; find where their reasoning broke down, repair from that exact point
- Student running low on time → rapid-fire mode, highest-yield only, strip everything non-essential
- Student says "I already know this" → challenge them with an application question; if they fail, flag it as a hidden gap
- Student overwhelmed → smaller chunks, checklist format, celebrate small wins
- Student asks "will this be on the exam?" → give honest probability assessment, never deflect

SECTION 7 — MEMORY TECHNIQUES (embed throughout)
- SPACED RETRIEVAL — revisit earlier concepts later in the session to force retrieval
- ELABORATIVE INTERROGATION — frequently ask "why does this work?" and "what would happen if this were different?"
- DUAL CODING — pair verbal explanations with described diagrams or spatial layouts the student can visualize
- CHUNKING — group related facts into named clusters for single retrievable units
- MNEMONIC ANCHORING — when there is a list to memorize, create a custom mnemonic, acronym, or story on the spot

SECTION 8 — TONE & PRESENCE
You are not a chatbot. You are a professor who has cleared their entire schedule to sit with this student.
→ Intense but not cold
→ Demanding but not discouraging
→ Fast-paced but never rushed when something needs depth
→ Confident in your knowledge, humble about uncertainty — if you do not know something with certainty, say so and reason through it together
→ 100% focused on one outcome: this student walks into that exam as prepared as humanly possible

Language rules:
- Match the student's vocabulary level but slightly elevate it — teach them the precise academic language used in this field
- Use concrete examples drawn from the actual course material whenever possible
- Never use filler phrases like "great question!" or "certainly!" — respect the student's time
- Be direct, dense, and useful. Every sentence must earn its place.`
  }

  const send = async () => {
    const text = input.trim()
    if (!text || typing) return
    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setTyping(true)

    try {
      const systemPrompt = buildContext()
      const payload = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...next.slice(-10), // last 10 messages for context window
        ],
        temperature: 0.4,
        max_tokens: 1200,
      }
      const token = await getAuthToken()
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      })
      if (res.status === 429) {
        const err = await res.json().catch(() => ({}))
        setMessages(prev => [...prev, { role: 'assistant', content: err.error || "You've hit your daily AI limit. It resets at midnight!" }])
        setTyping(false)
        return
      }
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || "I'm having trouble responding right now. Try again."
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't reach the AI right now. Check your connection and try again." }])
    } finally {
      setTyping(false)
    }
  }

  const SUGGESTIONS = [
    'You choose — start with the highest-yield topic',
    `Quiz me on ${topic || 'this material'} right now`,
    'What are the most likely exam questions on this?',
    'I only have 30 minutes — what can I absolutely not miss?',
    'Run the exam simulation (Phase C)',
    'Generate my final cram sheet',
  ]

  const renderMessage = (msg, i) => {
    const isUser = msg.role === 'user'
    return (
      <motion.div key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease }}
        style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
        {!isUser && (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${VIOLET},${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginRight: 10, alignSelf: 'flex-start', marginTop: 2 }}>⚡</div>
        )}
        <div style={{
          maxWidth: '82%',
          padding: isUser ? '10px 15px' : '13px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          background: isUser ? `linear-gradient(135deg,${BLUE},${CYAN})` : 'rgba(255,255,255,0.05)',
          border: isUser ? 'none' : `1px solid rgba(255,255,255,0.08)`,
          fontSize: 13, lineHeight: 1.7,
          color: isUser ? '#fff' : 'rgba(255,255,255,0.9)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
      </motion.div>
    )
  }

  // ── Inline full-width CLUTCH chat panel ──────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: `2px solid ${VIOLET}`,
        borderRadius: 20,
        display: 'flex', flexDirection: 'column',
        height: '100%',
        boxShadow: `0 0 60px ${VIOLET}0a`,
      }}>

      {/* top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${VIOLET}, ${BLUE}, transparent)` }} />

      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'rgba(139,92,246,0.04)' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${VIOLET},${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, boxShadow: `0 0 16px ${VIOLET}50` }}>⚡</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'white', letterSpacing: '-0.01em' }}>CLUTCH</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1, letterSpacing: '0.06em' }}>
            {topic || courseName || 'Study Session'} · Phase B — Active Teaching
          </div>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: `0 0 8px ${GREEN}`, animation: 'db-pulse-dot 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', marginLeft: 5 }}>ONLINE</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 10px', display: 'flex', flexDirection: 'column' }}>
        {messages.map(renderMessage)}
        {typing && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${VIOLET},${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>⚡</div>
            <div style={{ padding: '12px 16px', borderRadius: '4px 18px 18px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(j => (
                <motion.div key={j} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.65, delay: j * 0.15, repeat: Infinity }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: `${VIOLET}90` }} />
              ))}
            </div>
          </motion.div>
        )}
        {/* Quick suggestions — shown only at greeting */}
        {messages.length === 1 && !typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.18)', marginBottom: 4 }}>QUICK START</div>
            {SUGGESTIONS.map((s, i) => (
              <motion.button key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
                whileHover={{ x: 4, background: `${VIOLET}12` }}
                onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 40) }}
                style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`, color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.4 }}>
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, background: 'rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask CLUTCH anything — or answer a challenge question..."
            rows={1}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '11px 15px', color: '#fff', fontSize: 13, outline: 'none',
              resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 110, overflowY: 'auto',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = `${VIOLET}70`}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <motion.button
            whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
            onClick={send}
            disabled={!input.trim() || typing}
            style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: input.trim() && !typing ? `linear-gradient(135deg,${VIOLET},${BLUE})` : 'rgba(255,255,255,0.05)',
              border: 'none', cursor: input.trim() && !typing ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', boxShadow: input.trim() && !typing ? `0 0 18px ${VIOLET}40` : 'none',
            }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </motion.button>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 6, textAlign: 'center', letterSpacing: '0.05em' }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </motion.div>
  )
}
