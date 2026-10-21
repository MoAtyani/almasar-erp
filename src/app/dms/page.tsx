'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { DmsDocument, DocCategory } from '@/lib/types'
import { DOC_CATEGORY_LABELS, formatDate } from '@/lib/constants'

const SEED_DOCUMENTS: DmsDocument[] = [
  {
    id: 'doc-1',
    title: 'Single Line Diagram (SLD) - Main Substation MDB-01',
    title_ar: 'المخطط أحادي الخط (SLD) - المحطة الرئيسية',
    file_name: 'SLD-MDB-2500A-REV2.pdf',
    file_size: '4.2 MB',
    file_type: 'PDF',
    category: 'single_line_diagram',
    project_reference: 'PJ-2026-001',
    version: 'v2.1',
    status: 'approved',
    uploaded_by: 'Eng. Ahmed Al-Mansoor',
    upload_date: '2026-10-12',
  },
  {
    id: 'doc-2',
    title: 'AutoCAD General Arrangement & Busbar Sizing',
    title_ar: 'مخطط كاد العام ومقاسات قضبان البسبار النحاسي',
    file_name: 'GA-CAD-RITTAL-FRAME-01.dwg',
    file_size: '14.8 MB',
    file_type: 'DWG',
    category: 'cad_drawing',
    project_reference: 'PJ-2026-001',
    version: 'v1.4',
    status: 'approved',
    uploaded_by: 'Eng. Ahmed Al-Mansoor',
    upload_date: '2026-10-14',
  },
  {
    id: 'doc-3',
    title: 'BoQ Master Schedule - Switchgear Components & Relays',
    title_ar: 'جدول الكميات الرئيسي - مكونات القواطع والمرحلات',
    file_name: 'BoQ_Master_AlMasar_2026.xlsx',
    file_size: '850 KB',
    file_type: 'XLSX',
    category: 'boq_sheet',
    project_reference: 'PJ-2026-002',
    version: 'v1.0',
    status: 'pending_review',
    uploaded_by: 'Tariq Al-Harbi',
    upload_date: '2026-10-16',
  },
  {
    id: 'doc-4',
    title: 'Factory Acceptance Test (FAT) Dielectric & High Voltage Certificate',
    title_ar: 'شهادة اختبار عزل الجهد العالي والفحص المصنعي (FAT)',
    file_name: 'FAT_Certificate_SEC_Approval.pdf',
    file_size: '2.1 MB',
    file_type: 'PDF',
    category: 'fat_certificate',
    project_reference: 'PJ-2026-001',
    version: 'v1.0',
    status: 'approved',
    uploaded_by: 'Hassan Al-Otaibi',
    upload_date: '2026-10-18',
  },
  {
    id: 'doc-5',
    title: 'Client Technical Approval Sign-off Form',
    title_ar: 'نموذج اعتماد وتوقيع العميل الفني النهائي',
    file_name: 'Client_SignOff_SEC_signed.pdf',
    file_size: '1.4 MB',
    file_type: 'PDF',
    category: 'client_approval',
    project_reference: 'PJ-2026-001',
    version: 'v1.0',
    status: 'approved',
    uploaded_by: 'Sales Dept',
    upload_date: '2026-10-19',
  },
  {
    id: 'doc-6',
    title: 'Operation & Maintenance (O&M) Switchgear Manual',
    title_ar: 'دليل التشغيل والصيانة للمفاتيح الكهربائية',
    file_name: 'OM_Manual_AlMasar_Form4b.pdf',
    file_size: '9.6 MB',
    file_type: 'PDF',
    category: 'manual',
    project_reference: 'PJ-2026-003',
    version: 'v3.0',
    status: 'draft',
    uploaded_by: 'Eng. Ahmed Al-Mansoor',
    upload_date: '2026-10-20',
  },
]

export default function DmsPage() {
  const [documents, setDocuments] = useState<DmsDocument[]>(SEED_DOCUMENTS)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<DmsDocument | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Upload Form State
  const [uploadForm, setUploadForm] = useState({
    title: '',
    title_ar: '',
    category: 'single_line_diagram' as DocCategory,
    project_reference: 'PJ-2026-001',
    version: 'v1.0',
    file_name: '',
    file_size: '2.5 MB',
    file_type: 'PDF',
  })

  const filteredDocs = documents.filter(doc => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.title_ar.includes(q) ||
      doc.file_name.toLowerCase().includes(q) ||
      (doc.project_reference && doc.project_reference.toLowerCase().includes(q))
    )
  })

  function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const newDoc: DmsDocument = {
      id: `doc-${Date.now()}`,
      title: uploadForm.title,
      title_ar: uploadForm.title_ar || uploadForm.title,
      file_name: uploadForm.file_name || 'document.pdf',
      file_size: uploadForm.file_size,
      file_type: uploadForm.file_type,
      category: uploadForm.category,
      project_reference: uploadForm.project_reference,
      version: uploadForm.version,
      status: 'pending_review',
      uploaded_by: 'Current User',
      upload_date: new Date().toISOString().split('T')[0],
    }
    setDocuments([newDoc, ...documents])
    setShowUploadModal(false)
    setUploadForm({
      title: '',
      title_ar: '',
      category: 'single_line_diagram',
      project_reference: 'PJ-2026-001',
      version: 'v1.0',
      file_name: '',
      file_size: '2.5 MB',
      file_type: 'PDF',
    })
  }

  function handleApprove(id: string) {
    setDocuments(prev => prev.map(d => (d.id === id ? { ...d, status: 'approved' } : d)))
    if (selectedDoc && selectedDoc.id === id) {
      setSelectedDoc(prev => (prev ? { ...prev, status: 'approved' } : null))
    }
  }

  const categoryCounts = Object.keys(DOC_CATEGORY_LABELS).reduce((acc, cat) => {
    acc[cat] = documents.filter(d => d.category === cat).length
    return acc
  }, {} as Record<string, number>)

  return (
    <AppLayout
      title="Document Management System (DMS)"
      titleAr="إدارة المخططات والوثائق الهندسية (DMS)"
      actions={
        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          📁 Upload Technical Document
        </button>
      }
    >
      {/* Category Folders Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        <div
          className={`card ${selectedCategory === 'all' ? 'card-glow' : ''}`}
          style={{ padding: 14, cursor: 'pointer', textAlign: 'center', borderColor: selectedCategory === 'all' ? 'var(--accent)' : 'var(--border)' }}
          onClick={() => setSelectedCategory('all')}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>🗂️</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>All Technical Files</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{documents.length} files</div>
        </div>

        {Object.entries(DOC_CATEGORY_LABELS).map(([catKey, info]) => {
          const isSelected = selectedCategory === catKey
          return (
            <div
              key={catKey}
              className={`card ${isSelected ? 'card-glow' : ''}`}
              style={{
                padding: 14,
                cursor: 'pointer',
                textAlign: 'center',
                borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
              }}
              onClick={() => setSelectedCategory(catKey)}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{info.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{info.en.split('(')[0]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{categoryCounts[catKey] || 0} files</div>
            </div>
          )
        })}
      </div>

      {/* Main Document Listing Card */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {selectedCategory === 'all' ? 'All Switchgear Documents' : DOC_CATEGORY_LABELS[selectedCategory]?.en}
            </span>
            <span className="badge badge-subtle">{filteredDocs.length} items</span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="Search drawings, BoQ, certificates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ width: 300 }}
            />
          </div>
        </div>

        {/* Table of Documents */}
        <div className="table-container" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Document Title (En / Ar)</th>
                <th>Category</th>
                <th>Project Ref</th>
                <th>Rev</th>
                <th>File Size</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => {
                const catInfo = DOC_CATEGORY_LABELS[doc.category] || { en: doc.category, icon: '📄' }
                return (
                  <tr key={doc.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedDoc(doc)}>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: doc.file_type === 'DWG' ? '#8b5cf622' : doc.file_type === 'XLSX' ? '#22c55e22' : '#0ea5e922',
                        color: doc.file_type === 'DWG' ? '#8b5cf6' : doc.file_type === 'XLSX' ? '#22c55e' : '#0ea5e9',
                      }}>
                        {doc.file_type}
                      </span>
                    </td>
                    <td>
                      <div><strong>{doc.title}</strong></div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.title_ar}</div>
                      <div style={{ fontSize: 11, color: 'var(--accent)' }}>📎 {doc.file_name}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12 }}>{catInfo.icon} {catInfo.en.split('(')[0]}</span>
                    </td>
                    <td>
                      <span className="badge badge-subtle">{doc.project_reference || 'General'}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{doc.version}</td>
                    <td>{doc.file_size}</td>
                    <td>{doc.uploaded_by}</td>
                    <td>{formatDate(doc.upload_date)}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: doc.status === 'approved' ? '#22c55e22' : '#f59e0b22',
                          color: doc.status === 'approved' ? '#22c55e' : '#f59e0b',
                        }}
                      >
                        {doc.status.toUpperCase()}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => alert(`Downloading ${doc.file_name} (Simulated)`)}
                        >
                          ⬇️
                        </button>
                        {doc.status !== 'approved' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprove(doc.id)}
                          >
                            ✓ Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                    No documents found. Click &quot;Upload Technical Document&quot; to add files.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document View Modal */}
      {selectedDoc && (
        <div className="modal-backdrop" onClick={() => setSelectedDoc(null)}>
          <div className="modal-content" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 18 }}>{selectedDoc.title}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedDoc.title_ar}</span>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedDoc(null)}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{
                background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 10,
                padding: 30, textAlign: 'center', marginBottom: 20
              }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>
                  {selectedDoc.file_type === 'DWG' ? '📐' : selectedDoc.file_type === 'XLSX' ? '📊' : '📄'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedDoc.file_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {selectedDoc.file_size} • Version {selectedDoc.version} • {selectedDoc.file_type} File
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Project Reference:</span>
                  <div style={{ fontWeight: 600 }}>{selectedDoc.project_reference || 'General Standard'}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Category:</span>
                  <div style={{ fontWeight: 600 }}>{DOC_CATEGORY_LABELS[selectedDoc.category]?.en}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Uploaded By:</span>
                  <div style={{ fontWeight: 600 }}>{selectedDoc.uploaded_by}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Upload Date:</span>
                  <div style={{ fontWeight: 600 }}>{formatDate(selectedDoc.upload_date)}</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => alert(`Simulated Download of ${selectedDoc.file_name}`)}>
                ⬇️ Download Original File
              </button>
              {selectedDoc.status !== 'approved' && (
                <button className="btn btn-success" onClick={() => handleApprove(selectedDoc.id)}>
                  ✓ Approve Engineering Release
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="modal-backdrop" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleUpload}>
              <div className="modal-header">
                <h3>Upload Switchgear Document / Drawing</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">Document Title (English)</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder="e.g. Busbar Sizing Calculation 3200A"
                    value={uploadForm.title}
                    onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Document Title (Arabic)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. حساب مقاسات البسبار 3200 أمبير"
                    value={uploadForm.title_ar}
                    onChange={e => setUploadForm({ ...uploadForm, title_ar: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">Category</label>
                    <select
                      className="input"
                      value={uploadForm.category}
                      onChange={e => setUploadForm({ ...uploadForm, category: e.target.value as DocCategory })}
                    >
                      {Object.entries(DOC_CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Project Reference</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. PJ-2026-001"
                      value={uploadForm.project_reference}
                      onChange={e => setUploadForm({ ...uploadForm, project_reference: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">File Name</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder="e.g. Drawing_MDB_01.dwg"
                      value={uploadForm.file_name}
                      onChange={e => setUploadForm({ ...uploadForm, file_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Format</label>
                    <select
                      className="input"
                      value={uploadForm.file_type}
                      onChange={e => setUploadForm({ ...uploadForm, file_type: e.target.value })}
                    >
                      <option value="PDF">PDF</option>
                      <option value="DWG">DWG (CAD)</option>
                      <option value="XLSX">Excel</option>
                      <option value="DOCX">Word</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Revision</label>
                    <input
                      type="text"
                      className="input"
                      value={uploadForm.version}
                      onChange={e => setUploadForm({ ...uploadForm, version: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Upload & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
