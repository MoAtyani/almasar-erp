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
      // 1. Health / Welcome
      if (pathname === '/' || pathname === '/health') {
        const stats = await env.DB.prepare(`
          SELECT 
            (SELECT COUNT(*) FROM panel_projects) as projects_count,
            (SELECT COUNT(*) FROM profiles) as users_count,
            (SELECT COUNT(*) FROM production_orders) as orders_count,
            (SELECT COUNT(*) FROM inventory_items) as items_count
        `).first();

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
