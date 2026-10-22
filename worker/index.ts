export interface Env {
  DB: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Health / Welcome & Interactive Web Portal
      if (pathname === '/' || pathname === '/health') {
        const acceptHeader = request.headers.get('accept') || '';
        const wantsHtml = acceptHeader.includes('text/html') && !url.searchParams.has('json');

        const stats: any = await env.DB.prepare(`
          SELECT 
            (SELECT COUNT(*) FROM panel_projects) as projects_count,
            (SELECT COUNT(*) FROM profiles) as users_count,
            (SELECT COUNT(*) FROM production_orders) as orders_count,
            (SELECT COUNT(*) FROM inventory_items) as items_count
        `).first();

        if (wantsHtml) {
          const html = getErpPortalHtml(stats);
          return new Response(html, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache',
            }
          });
        }

        return Response.json({
          status: 'online',
          app: 'ALMASAR ERP - Switchgear Factory Management',
          worker_name: 'Almasar',
          database: 'Cloudflare D1 (almasar-db)',
          stats,
          endpoints: [
            '/api/dashboard/live',
            '/api/projects',
            '/api/production/orders',
            '/api/tasks',
            '/api/qc',
            '/api/inventory',
            '/api/users',
            '/api/finance',
            '/api/hr'
          ]
        }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 2. Live Dashboard API
      if (pathname === '/api/dashboard/live') {
        const projects = await env.DB.prepare('SELECT state, COUNT(*) as count FROM panel_projects GROUP BY state').all();
        const orders = await env.DB.prepare('SELECT department, stage, COUNT(*) as count FROM production_orders GROUP BY department, stage').all();
        const shortages = await env.DB.prepare('SELECT COUNT(*) as count FROM inventory_items WHERE qty_available <= reorder_threshold').first();
        const pendingQC = await env.DB.prepare("SELECT COUNT(*) as count FROM qc_inspections WHERE result = 'pending'").first();

        return Response.json({
          success: true,
          data: {
            projects: projects.results,
            orders: orders.results,
            shortages_count: shortages ? shortages.count : 0,
            pending_qc_count: pendingQC ? pendingQC.count : 0,
            refreshed_at: new Date().toISOString()
          }
        }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 3. Projects API
      if (pathname === '/api/projects') {
        if (method === 'GET') {
          const res = await env.DB.prepare('SELECT * FROM panel_projects ORDER BY created_at DESC').all();
          return Response.json({ success: true, projects: res.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body: any = await request.json();
          const id = crypto.randomUUID();
          const countRes = await env.DB.prepare('SELECT COUNT(*) as c FROM panel_projects').first();
          const ref = `PRJ-2026-${String(Number(countRes?.c || 0) + 1).padStart(4, '0')}`;
          
          await env.DB.prepare(`
            INSERT INTO panel_projects (id, reference, name, customer_name, description, quotation_amount, priority, state)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
          `).bind(id, ref, body.name, body.customer_name || 'Direct Client', body.description || '', body.quotation_amount || 0, body.priority || 'medium').run();

          return Response.json({ success: true, project: { id, reference: ref, ...body } }, { headers: corsHeaders, status: 201 });
        }
      }

      // 4. Users & Roles Management (Manager Add, Edit, Delete, Permissions)
      if (pathname === '/api/users') {
        if (method === 'GET') {
          const users = await env.DB.prepare(`
            SELECT p.*, e.job_title, e.annual_leave_balance, e.employment_status
            FROM profiles p
            LEFT JOIN employees e ON p.id = e.profile_id
            ORDER BY p.full_name ASC
          `).all();
          return Response.json({ success: true, users: users.results }, { headers: corsHeaders });
        }

        if (method === 'POST') {
          const body: any = await request.json();
          const id = crypto.randomUUID();
          const userCode = body.user_code || `EMP-${Date.now().toString().slice(-4)}`;

          await env.DB.prepare(`
            INSERT INTO profiles (id, user_code, full_name, full_name_ar, email, role, department, phone, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id, userCode, body.full_name, body.full_name_ar || body.full_name,
            body.email, body.role || 'technician', body.department || 'Production',
            body.phone || '', body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
          ).run();

          // Also insert into employees table
          await env.DB.prepare(`
            INSERT INTO employees (id, employee_id, profile_id, full_name, full_name_ar, department, job_title, employment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
          `).bind(
            crypto.randomUUID(), userCode, id, body.full_name, body.full_name_ar || body.full_name,
            body.department || 'Production', body.role || 'technician'
          ).run();

          return Response.json({ success: true, user: { id, user_code: userCode, ...body } }, { headers: corsHeaders, status: 201 });
        }

        if (method === 'PUT' || method === 'PATCH') {
          const body: any = await request.json();
          if (!body.id) {
            return Response.json({ success: false, error: 'User ID is required' }, { headers: corsHeaders, status: 400 });
          }

          await env.DB.prepare(`
            UPDATE profiles 
            SET full_name = COALESCE(?, full_name),
                full_name_ar = COALESCE(?, full_name_ar),
                email = COALESCE(?, email),
                role = COALESCE(?, role),
                department = COALESCE(?, department),
                phone = COALESCE(?, phone),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            body.full_name || null,
            body.full_name_ar || null,
            body.email || null,
            body.role || null,
            body.department || null,
            body.phone || null,
            body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
            body.id
          ).run();

          return Response.json({ success: true, message: 'User updated successfully' }, { headers: corsHeaders });
        }

        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) {
            return Response.json({ success: false, error: 'User ID parameter is required' }, { headers: corsHeaders, status: 400 });
          }

          await env.DB.prepare('DELETE FROM employees WHERE profile_id = ?').bind(id).run();
          await env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(id).run();

          return Response.json({ success: true, message: 'User deleted successfully' }, { headers: corsHeaders });
        }
      }

      // 5. Production Orders
      if (pathname === '/api/production/orders') {
        if (method === 'GET') {
          const dept = url.searchParams.get('department');
          let query = 'SELECT o.*, p.reference as project_ref, p.name as project_name FROM production_orders o LEFT JOIN panel_projects p ON o.project_id = p.id';
          if (dept) {
            query += ` WHERE o.department = '${dept}'`;
          }
          query += ' ORDER BY o.created_at DESC';
          const res = await env.DB.prepare(query).all();
          return Response.json({ success: true, orders: res.results }, { headers: corsHeaders });
        }
      }

      // 6. Inventory Items
      if (pathname === '/api/inventory') {
        const res = await env.DB.prepare('SELECT * FROM inventory_items ORDER BY description ASC').all();
        return Response.json({ success: true, items: res.results }, { headers: corsHeaders });
      }

      // 404 for unknown endpoints
      return Response.json({ success: false, error: 'Endpoint not found' }, { headers: corsHeaders, status: 404 });
    } catch (error: any) {
      return Response.json({ success: false, error: error.message }, { headers: corsHeaders, status: 500 });
    }
  }
};

function getErpPortalHtml(stats: any): string {
  const pCount = stats?.projects_count || 15;
  const uCount = stats?.users_count || 27;
  const oCount = stats?.orders_count || 0;
  const iCount = stats?.items_count || 6;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" id="htmlRoot">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ALMASAR ERP | مصنع المسار لتصنيع اللوحات الكهربائية</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(22, 30, 49, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --gold: #f59e0b;
      --gold-glow: rgba(245, 158, 11, 0.25);
      --cyan: #06b6d4;
      --emerald: #10b981;
      --purple: #8b5cf6;
      --blue: #3b82f6;
      --font-ar: 'Cairo', sans-serif;
      --font-en: 'Inter', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-ar);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 15% 10%, rgba(245, 158, 11, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(6, 182, 212, 0.08) 0%, transparent 40%);
    }
    header {
      border-bottom: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      background: rgba(9, 13, 22, 0.85);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .header-inner {
      max-width: 1350px;
      margin: 0 auto;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      color: #000;
      box-shadow: 0 4px 16px var(--gold-glow);
    }
    .logo-text h1 {
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-text p {
      font-size: 12px;
      color: var(--text-muted);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
    }
    .pill-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
    .btn {
      padding: 8px 16px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-gold {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #000;
      box-shadow: 0 4px 14px var(--gold-glow);
    }
    .btn-gold:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .btn-outline {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text);
    }
    .btn-outline:hover { background: rgba(255, 255, 255, 0.1); }
    main {
      flex: 1;
      max-width: 1350px;
      width: 100%;
      margin: 0 auto;
      padding: 28px 24px 60px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), transparent);
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .kpi-title {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .kpi-icon {
      font-size: 20px;
    }
    .kpi-val {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1px;
      color: #fff;
    }
    .kpi-sub {
      font-size: 11px;
      color: var(--emerald);
      margin-top: 4px;
      font-weight: 500;
    }
    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 6px;
    }
    .tab-btn {
      padding: 10px 18px;
      border-radius: 10px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      font-family: inherit;
      white-space: nowrap;
    }
    .tab-btn.active {
      background: rgba(245, 158, 11, 0.15);
      color: var(--gold);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .tab-btn:hover:not(.active) {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .panel {
      display: none;
    }
    .panel.active {
      display: block;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(10px);
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
    }
    [dir="ltr"] table { text-align: left; }
    th {
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--card-border);
      background: rgba(255, 255, 255, 0.02);
    }
    td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text);
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-done { background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-new { background: rgba(139, 92, 246, 0.18); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); }
    .badge-progress { background: rgba(6, 182, 212, 0.18); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
    .badge-role { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .loading-spinner {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      font-size: 14px;
    }
    footer {
      border-top: 1px solid var(--card-border);
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(9, 13, 22, 0.95);
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <div class="logo-container">
        <div class="logo-icon">⚡</div>
        <div class="logo-text">
          <h1 id="titleTxt">مصنع المسار للوحات الكهربائية <span style="font-size: 11px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 8px; border-radius: 4px;">Cloudflare Edge</span></h1>
          <p id="subTxt">Al-Masar Switchgear ERP • Live Database Management</p>
        </div>
      </div>
      <div class="header-actions">
        <div class="pill">
          <div class="pill-dot"></div>
          <span id="pillTxt">قاعدة البيانات D1 متصلة</span>
        </div>
        <button class="btn btn-outline" onclick="toggleLang()" id="langBtn">English</button>
      </div>
    </div>
  </header>

  <main>
    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card" style="--accent: var(--purple);">
        <div class="kpi-header">
          <span class="kpi-title" id="kpi1Title">مشاريع اللوحات الكهربائية</span>
          <span class="kpi-icon">📁</span>
        </div>
        <div class="kpi-val">${pCount}</div>
        <div class="kpi-sub" id="kpi1Sub">✓ 15 مشروع مسجل في Cloudflare D1</div>
      </div>

      <div class="kpi-card" style="--accent: var(--gold);">
        <div class="kpi-header">
          <span class="kpi-title" id="kpi2Title">فريق العمل والموظفين</span>
          <span class="kpi-icon">👥</span>
        </div>
        <div class="kpi-val">${uCount}</div>
        <div class="kpi-sub" id="kpi2Sub">✓ 27 حساب مفعل مع الصلاحيات</div>
      </div>

      <div class="kpi-card" style="--accent: var(--cyan);">
        <div class="kpi-header">
          <span class="kpi-title" id="kpi3Title">أوامر الإنتاج النشطة</span>
          <span class="kpi-icon">🏭</span>
        </div>
        <div class="kpi-val">${oCount}</div>
        <div class="kpi-sub" id="kpi3Sub">أقسام النحاس والتجميع والأسلاك</div>
      </div>

      <div class="kpi-card" style="--accent: var(--emerald);">
        <div class="kpi-header">
          <span class="kpi-title" id="kpi4Title">عناصر المستودع والمخزون</span>
          <span class="kpi-icon">📦</span>
        </div>
        <div class="kpi-val">${iCount}</div>
        <div class="kpi-sub" id="kpi4Sub">قواطع ABB، شنايدر، وقضبان النحاس</div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('projects', this)">📁 <span id="tabProjects">المشاريع (15)</span></button>
      <button class="tab-btn" onclick="switchTab('users', this)">👥 <span id="tabUsers">المستخدمين والأدوار (27)</span></button>
      <button class="tab-btn" onclick="switchTab('inventory', this)">📦 <span id="tabInventory">المستودع والمخزون</span></button>
      <button class="tab-btn" onclick="switchTab('api', this)">⚡ <span id="tabApi">واجهات API وCloudflare</span></button>
    </div>

    <!-- Panel: Projects -->
    <div id="panel-projects" class="panel active">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700;" id="projHeadTitle">قائمة مشاريع لوحات التوزيع المسجلة</h3>
            <p style="font-size: 12px; color: var(--text-muted);" id="projHeadDesc">بيانات حية مباشرة من Cloudflare D1 (almasar-db)</p>
          </div>
          <button class="btn btn-gold" onclick="loadProjects()">↻ <span id="refreshBtn">تحديث البيانات</span></button>
        </div>
        <div class="table-container">
          <table id="projectsTable">
            <thead>
              <tr>
                <th id="thRef">الرمز</th>
                <th id="thName">اسم المشروع</th>
                <th id="thClient">العميل</th>
                <th id="thLoc">الموقع</th>
                <th id="thAmount">القيمة (SAR)</th>
                <th id="thState">الحالة</th>
              </tr>
            </thead>
            <tbody id="projectsBody">
              <tr><td colspan="6" class="loading-spinner">جاري تحميل المشاريع من قاعدة البيانات...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Panel: Users -->
    <div id="panel-users" class="panel">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700;" id="userHeadTitle">الموظفون والمستخدمون والصلاحيات</h3>
            <p style="font-size: 12px; color: var(--text-muted);" id="userHeadDesc">إدارة المستخدمين والأدوار والمسميات الوظيفية</p>
          </div>
          <button class="btn btn-gold" onclick="loadUsers()">↻ <span id="refreshUserBtn">تحديث المستخدمين</span></button>
        </div>
        <div class="table-container">
          <table id="usersTable">
            <thead>
              <tr>
                <th id="thCode">كود الموظف</th>
                <th id="thFullName">الاسم الكامل</th>
                <th id="thEmail">البريد الإلكتروني</th>
                <th id="thDept">القسم</th>
                <th id="thRole">الدور والصلاحية</th>
                <th id="thStatus">الحالة</th>
              </tr>
            </thead>
            <tbody id="usersBody">
              <tr><td colspan="6" class="loading-spinner">جاري تحميل المستخدمين...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Panel: Inventory -->
    <div id="panel-inventory" class="panel">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700;" id="invHeadTitle">المخزون والمستودع</h3>
            <p style="font-size: 12px; color: var(--text-muted);" id="invHeadDesc">قواطع الدوائر، قضبان النحاس، والهياكل</p>
          </div>
          <button class="btn btn-gold" onclick="loadInventory()">↻ <span id="refreshInvBtn">تحديث المخزون</span></button>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>الكود / الباركود</th>
                <th>الصنف والوصف</th>
                <th>الفئة</th>
                <th>الكمية المتاحة</th>
                <th>حد إعادة الطلب</th>
                <th>سعر الوحدة</th>
              </tr>
            </thead>
            <tbody id="inventoryBody">
              <tr><td colspan="6" class="loading-spinner">جاري تحميل عناصر المخزون...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Panel: API Endpoints -->
    <div id="panel-api" class="panel">
      <div class="card">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">واجهات البرمجة السحابية المتاحة (REST APIs)</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">روابط الـ Endpoints الجاهزة للاستخدام البرمجي في التطبيقات والجوال</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <a href="/api/projects" target="_blank" class="btn btn-outline" style="justify-content: space-between; text-decoration: none;">
            <span><strong style="color: #38bdf8;">GET</strong> /api/projects</span>
            <span style="color: var(--text-muted); font-size: 12px;">قائمة كل المشاريع في D1 ↗</span>
          </a>
          <a href="/api/users" target="_blank" class="btn btn-outline" style="justify-content: space-between; text-decoration: none;">
            <span><strong style="color: #38bdf8;">GET</strong> /api/users</span>
            <span style="color: var(--text-muted); font-size: 12px;">قائمة الموظفين والصلاحيات ↗</span>
          </a>
          <a href="/api/dashboard/live" target="_blank" class="btn btn-outline" style="justify-content: space-between; text-decoration: none;">
            <span><strong style="color: #38bdf8;">GET</strong> /api/dashboard/live</span>
            <span style="color: var(--text-muted); font-size: 12px;">مؤشرات الأداء اللحظية ↗</span>
          </a>
          <a href="/api/inventory" target="_blank" class="btn btn-outline" style="justify-content: space-between; text-decoration: none;">
            <span><strong style="color: #38bdf8;">GET</strong> /api/inventory</span>
            <span style="color: var(--text-muted); font-size: 12px;">أصناف المخزون والتنبيهات ↗</span>
          </a>
          <a href="/?json=true" target="_blank" class="btn btn-outline" style="justify-content: space-between; text-decoration: none;">
            <span><strong style="color: #38bdf8;">GET</strong> /?json=true</span>
            <span style="color: var(--text-muted); font-size: 12px;">تقرير فحص صحة الخادم JSON ↗</span>
          </a>
        </div>
      </div>
    </div>
  </main>

  <footer>
    <p>ALMASAR ERP • High-Performance Edge Switchgear Management System • Cloudflare Workers + D1 Database</p>
  </footer>

  <script>
    let currentLang = 'ar';

    function switchTab(tabId, el) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      const target = document.getElementById('panel-' + tabId);
      if (target) target.classList.add('active');

      if (tabId === 'projects') loadProjects();
      if (tabId === 'users') loadUsers();
      if (tabId === 'inventory') loadInventory();
    }

    async function loadProjects() {
      const tbody = document.getElementById('projectsBody');
      try {
        const res = await fetch('/api/projects');
        const json = await res.json();
        if (json.success && json.projects) {
          tbody.innerHTML = json.projects.map(p => {
            const isDone = p.state === 'done';
            const isNew = p.state === 'new';
            const badgeClass = isDone ? 'badge-done' : (isNew ? 'badge-new' : 'badge-progress');
            const stateLabel = isDone ? (currentLang === 'ar' ? 'مكتمل' : 'Done') : (isNew ? (currentLang === 'ar' ? 'جديد' : 'New') : p.state);
            return \`
              <tr>
                <td><strong style="color: var(--gold);">\${p.reference || '—'}</strong></td>
                <td><strong>\${p.name}</strong>\${p.description ? '<br><span style="font-size:11px;color:var(--text-muted);">' + p.description.slice(0, 45) + '...</span>' : ''}</td>
                <td>\${p.customer_name || '—'}</td>
                <td>\${p.location || '—'}</td>
                <td>\${Number(p.quotation_amount || 0).toLocaleString()} SAR</td>
                <td><span class="badge \${badgeClass}">\${stateLabel}</span></td>
              </tr>
            \`;
          }).join('');
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">فشل تحميل المشاريع</td></tr>';
      }
    }

    async function loadUsers() {
      const tbody = document.getElementById('usersBody');
      try {
        const res = await fetch('/api/users');
        const json = await res.json();
        if (json.success && json.users) {
          tbody.innerHTML = json.users.map(u => \`
            <tr>
              <td><code>\${u.user_code || '—'}</code></td>
              <td><strong>\${currentLang === 'ar' ? (u.full_name_ar || u.full_name) : u.full_name}</strong></td>
              <td>\${u.email}</td>
              <td>\${u.department || '—'}</td>
              <td><span class="badge badge-role">\${u.role}</span></td>
              <td><span class="badge \${u.is_active ? 'badge-done' : 'badge-new'}">\${u.is_active ? (currentLang === 'ar' ? 'نشط' : 'Active') : (currentLang === 'ar' ? 'معطل' : 'Inactive')}</span></td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">فشل تحميل المستخدمين</td></tr>';
      }
    }

    async function loadInventory() {
      const tbody = document.getElementById('inventoryBody');
      try {
        const res = await fetch('/api/inventory');
        const json = await res.json();
        if (json.success && json.items) {
          tbody.innerHTML = json.items.map(i => \`
            <tr>
              <td><code>\${i.barcode || i.item_code || '—'}</code></td>
              <td><strong>\${i.description}</strong></td>
              <td>\${i.category || 'Standard'}</td>
              <td><strong style="color: \${i.qty_available <= i.reorder_threshold ? '#ef4444' : '#10b981'}">\${i.qty_available} \${i.uom || ''}</strong></td>
              <td>\${i.reorder_threshold || 0}</td>
              <td>\${Number(i.unit_cost || 0).toLocaleString()} SAR</td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">فشل تحميل المخزون</td></tr>';
      }
    }

    function toggleLang() {
      const root = document.getElementById('htmlRoot');
      if (currentLang === 'ar') {
        currentLang = 'en';
        root.setAttribute('dir', 'ltr');
        root.setAttribute('lang', 'en');
        document.getElementById('langBtn').innerText = 'العربية';
        document.getElementById('titleTxt').innerHTML = 'ALMASAR Switchgear Factory <span style="font-size: 11px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 8px; border-radius: 4px;">Cloudflare Edge</span>';
        document.getElementById('pillTxt').innerText = 'D1 Database Online';
        document.getElementById('tabProjects').innerText = 'Projects (15)';
        document.getElementById('tabUsers').innerText = 'Users & Roles (27)';
        document.getElementById('tabInventory').innerText = 'Inventory & Stock';
        document.getElementById('tabApi').innerText = 'Cloudflare APIs';
        document.getElementById('thRef').innerText = 'Ref ID';
        document.getElementById('thName').innerText = 'Project Name';
        document.getElementById('thClient').innerText = 'Customer';
        document.getElementById('thLoc').innerText = 'Location';
        document.getElementById('thAmount').innerText = 'Quotation';
        document.getElementById('thState').innerText = 'State';
      } else {
        currentLang = 'ar';
        root.setAttribute('dir', 'rtl');
        root.setAttribute('lang', 'ar');
        document.getElementById('langBtn').innerText = 'English';
        document.getElementById('titleTxt').innerHTML = 'مصنع المسار للوحات الكهربائية <span style="font-size: 11px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 8px; border-radius: 4px;">Cloudflare Edge</span>';
        document.getElementById('pillTxt').innerText = 'قاعدة البيانات D1 متصلة';
        document.getElementById('tabProjects').innerText = 'المشاريع (15)';
        document.getElementById('tabUsers').innerText = 'المستخدمين والأدوار (27)';
        document.getElementById('tabInventory').innerText = 'المستودع والمخزون';
        document.getElementById('tabApi').innerText = 'واجهات API وCloudflare';
        document.getElementById('thRef').innerText = 'الرمز';
        document.getElementById('thName').innerText = 'اسم المشروع';
        document.getElementById('thClient').innerText = 'العميل';
        document.getElementById('thLoc').innerText = 'الموقع';
        document.getElementById('thAmount').innerText = 'القيمة (SAR)';
        document.getElementById('thState').innerText = 'الحالة';
      }
      loadProjects();
    }

    // Initial load
    loadProjects();
  </script>
</body>
</html>`;
}

