import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
// @ts-ignore
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

export interface Env {
  DB: any;
  __STATIC_CONTENT?: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
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
      // 1. Serve Next.js static exported pages and assets for all non-API routes
      if (!pathname.startsWith('/api')) {
        const wantsJson = url.searchParams.has('json') && pathname === '/';
        if (!wantsJson) {
          try {
            // First attempt: direct asset match (e.g. /_next/..., /favicon.ico, /index.html)
            return await getAssetFromKV(
              {
                request,
                waitUntil: (p: Promise<any>) => ctx.waitUntil(p),
              },
              {
                ASSET_NAMESPACE: env.__STATIC_CONTENT,
                ASSET_MANIFEST: assetManifest,
              }
            );
          } catch (e1: any) {
            // Second attempt: map clean Next.js routes (/crm, /production, /dashboard) to .html files
            try {
              const cleanPath = pathname.replace(/\/$/, '');
              const htmlUrl = new URL(request.url);
              htmlUrl.pathname = cleanPath ? `${cleanPath}.html` : '/index.html';
              return await getAssetFromKV(
                {
                  request: new Request(htmlUrl.toString(), request),
                  waitUntil: (p: Promise<any>) => ctx.waitUntil(p),
                },
                {
                  ASSET_NAMESPACE: env.__STATIC_CONTENT,
                  ASSET_MANIFEST: assetManifest,
                }
              );
            } catch (e2: any) {
              // Third attempt: SPA fallback to /index.html
              try {
                const fallbackUrl = new URL('/index.html', request.url);
                return await getAssetFromKV(
                  {
                    request: new Request(fallbackUrl.toString(), request),
                    waitUntil: (p: Promise<any>) => ctx.waitUntil(p),
                  },
                  {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: assetManifest,
                  }
                );
              } catch (e3: any) {
                // Last fallback: show server stats
              }
            }
          }
        }

        return Response.json({
          status: 'online',
          app: 'ALMASAR ERP - Switchgear Factory Management',
          worker_name: 'Almasar',
          database: 'Cloudflare D1 (almasar-db)',
          stats: { status: 'healthy' },
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

      // 2.5 D1 Batch Synchronization
      if (pathname === '/api/d1-batch-sync' && method === 'POST') {
        const body: any = await request.json();
        const statements: string[] = body.statements || [];
        let executed = 0;
        const errors: any[] = [];
        for (const sql of statements) {
          try {
            await env.DB.prepare(sql).run();
            executed++;
          } catch (e: any) {
            errors.push({ sql: sql.substring(0, 100), error: e.message || String(e) });
          }
        }
        return Response.json({ success: true, count: executed, errors }, { headers: corsHeaders });
      }

      // 3. Projects API (CRUD)
      if (pathname === '/api/projects') {
        if (method === 'GET') {
          const res = await env.DB.prepare('SELECT * FROM panel_projects ORDER BY created_at DESC').all();
          return Response.json({ success: true, data: res.results, projects: res.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body: any = await request.json();
          const id = crypto.randomUUID();
          const countRes = await env.DB.prepare('SELECT COUNT(*) as c FROM panel_projects').first();
          const ref = `PRJ-2026-${String(Number(countRes?.c || 0) + 1).padStart(4, '0')}`;
          
          await env.DB.prepare(`
            INSERT INTO panel_projects (
              id, reference, name, customer_name, customer_email, customer_phone,
              location, description, quotation_amount, currency, priority,
              date_start, date_delivery, state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            ref,
            body.name,
            body.customer_name || 'Direct Client',
            body.customer_email || '',
            body.customer_phone || '',
            body.location || 'KSA',
            body.description || '',
            body.quotation_amount ? Number(body.quotation_amount) : 0,
            body.currency || 'SAR',
            body.priority || 'medium',
            body.date_start || new Date().toISOString(),
            body.date_delivery || null,
            body.state || 'new'
          ).run();

          return Response.json({ success: true, project: { id, reference: ref, ...body } }, { headers: corsHeaders, status: 201 });
        }
        if (method === 'PUT' || method === 'PATCH') {
          const body: any = await request.json();
          if (!body.id) {
            return Response.json({ success: false, error: 'Project ID required' }, { headers: corsHeaders, status: 400 });
          }
          await env.DB.prepare(`
            UPDATE panel_projects
            SET name = COALESCE(?, name),
                customer_name = COALESCE(?, customer_name),
                customer_email = COALESCE(?, customer_email),
                customer_phone = COALESCE(?, customer_phone),
                location = COALESCE(?, location),
                description = COALESCE(?, description),
                quotation_amount = COALESCE(?, quotation_amount),
                priority = COALESCE(?, priority),
                state = COALESCE(?, state),
                date_delivery = COALESCE(?, date_delivery),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            body.name || null,
            body.customer_name || null,
            body.customer_email || null,
            body.customer_phone || null,
            body.location || null,
            body.description || null,
            body.quotation_amount !== undefined ? Number(body.quotation_amount) : null,
            body.priority || null,
            body.state || null,
            body.date_delivery || null,
            body.id
          ).run();
          return Response.json({ success: true, message: 'Project updated successfully' }, { headers: corsHeaders });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return Response.json({ success: false, error: 'Project ID required' }, { headers: corsHeaders, status: 400 });
          await env.DB.prepare('DELETE FROM technician_tasks WHERE project_id = ?').bind(id).run();
          await env.DB.prepare('DELETE FROM production_orders WHERE project_id = ?').bind(id).run();
          await env.DB.prepare('DELETE FROM purchase_orders WHERE project_id = ?').bind(id).run();
          await env.DB.prepare('DELETE FROM panel_projects WHERE id = ?').bind(id).run();
          return Response.json({ success: true, message: 'Project deleted successfully' }, { headers: corsHeaders });
        }
      }

      // 4. Tasks API (Workflow, Assign, Finish, Move to other tasks)
      if (pathname === '/api/tasks') {
        if (method === 'GET') {
          const tasks = await env.DB.prepare(`
            SELECT t.*, p.name as project_name, p.reference as project_reference,
                   prof.full_name as assigned_employee_name, prof.full_name_ar as assigned_employee_name_ar
            FROM technician_tasks t
            LEFT JOIN panel_projects p ON t.project_id = p.id
            LEFT JOIN profiles prof ON t.assigned_employee_id = prof.id
            ORDER BY t.created_at DESC
          `).all();
          return Response.json({ success: true, data: tasks.results, tasks: tasks.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body: any = await request.json();
          const id = crypto.randomUUID();
          const countRes = await env.DB.prepare('SELECT COUNT(*) as c FROM technician_tasks').first();
          const code = `TSK-${String(Number(countRes?.c || 0) + 1).padStart(4, '0')}`;

          await env.DB.prepare(`
            INSERT INTO technician_tasks (
              id, task_code, title, description, project_id, assigned_employee_id,
              department, status, priority, estimated_hours
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            code,
            body.title,
            body.description || '',
            body.project_id || null,
            body.assigned_employee_id || body.assigned_to || null,
            body.department || 'Assembly',
            body.status || 'assigned',
            body.priority || 'medium',
            body.estimated_hours ? Number(body.estimated_hours) : 8.0
          ).run();

          return Response.json({ success: true, task: { id, task_code: code, ...body } }, { headers: corsHeaders, status: 201 });
        }
        if (method === 'PUT' || method === 'PATCH') {
          const body: any = await request.json();
          if (!body.id) return Response.json({ success: false, error: 'Task ID required' }, { headers: corsHeaders, status: 400 });

          // Support state advancement
          let newStatus = body.status;
          if (body.action === 'start') newStatus = 'in_progress';
          if (body.action === 'finish' || body.action === 'complete') newStatus = 'completed';

          await env.DB.prepare(`
            UPDATE technician_tasks
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                department = COALESCE(?, department),
                assigned_employee_id = COALESCE(?, assigned_employee_id),
                priority = COALESCE(?, priority),
                status = COALESCE(?, status),
                estimated_hours = COALESCE(?, estimated_hours),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            body.title || null,
            body.description || null,
            body.department || null,
            body.assigned_employee_id || body.assigned_to || null,
            body.priority || null,
            newStatus || null,
            body.estimated_hours !== undefined ? Number(body.estimated_hours) : null,
            body.id
          ).run();

          return Response.json({ success: true, message: 'Task updated successfully' }, { headers: corsHeaders });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return Response.json({ success: false, error: 'Task ID required' }, { headers: corsHeaders, status: 400 });
          await env.DB.prepare('DELETE FROM technician_tasks WHERE id = ?').bind(id).run();
          return Response.json({ success: true, message: 'Task deleted successfully' }, { headers: corsHeaders });
        }
      }

      // 5. Production Orders
      if (pathname === '/api/production/orders') {
        if (method === 'GET') {
          const res = await env.DB.prepare(`
            SELECT o.*, p.reference as project_ref, p.name as project_name
            FROM production_orders o
            LEFT JOIN panel_projects p ON o.project_id = p.id
            ORDER BY o.created_at DESC
          `).all();
          return Response.json({ success: true, data: res.results, orders: res.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body: any = await request.json();
          const id = crypto.randomUUID();
          const countRes = await env.DB.prepare('SELECT COUNT(*) as c FROM production_orders').first();
          const orderNum = `ORD-2026-${String(Number(countRes?.c || 0) + 1).padStart(3, '0')}`;

          await env.DB.prepare(`
            INSERT INTO production_orders (
              id, order_number, project_id, item_description, department, stage, quantity, requires_painting
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            orderNum,
            body.project_id || null,
            body.item_description || 'Switchgear Panel Assembly',
            body.department || 'electrical',
            body.stage || 'in_progress',
            body.quantity ? Number(body.quantity) : 1,
            body.requires_painting ? 1 : 0
          ).run();

          return Response.json({ success: true, order: { id, order_number: orderNum, ...body } }, { headers: corsHeaders, status: 201 });
        }
        if (method === 'PUT' || method === 'PATCH') {
          const body: any = await request.json();
          if (!body.id) return Response.json({ success: false, error: 'Order ID required' }, { headers: corsHeaders, status: 400 });

          await env.DB.prepare(`
            UPDATE production_orders
            SET item_description = COALESCE(?, item_description),
                department = COALESCE(?, department),
                stage = COALESCE(?, stage),
                quantity = COALESCE(?, quantity),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            body.item_description || null,
            body.department || null,
            body.stage || null,
            body.quantity !== undefined ? Number(body.quantity) : null,
            body.id
          ).run();

          return Response.json({ success: true, message: 'Production order updated successfully' }, { headers: corsHeaders });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return Response.json({ success: false, error: 'Order ID required' }, { headers: corsHeaders, status: 400 });
          await env.DB.prepare('DELETE FROM production_orders WHERE id = ?').bind(id).run();
          return Response.json({ success: true, message: 'Production order deleted successfully' }, { headers: corsHeaders });
        }
      }

      // 6. Procurement & Purchase Orders (With Project Cost & Purchase Lines)
      if (pathname === '/api/procurement') {
        if (method === 'GET') {
          const pos = await env.DB.prepare(`
            SELECT po.*, p.reference as project_reference, p.name as project_name
            FROM purchase_orders po
            LEFT JOIN panel_projects p ON po.project_id = p.id
            ORDER BY po.created_at DESC
          `).all();

          // Also get lines
          const lines = await env.DB.prepare('SELECT * FROM purchase_order_lines').all();
          const linesByPo: Record<string, any[]> = {};
          for (const l of lines.results as any[]) {
            if (!linesByPo[l.po_id]) linesByPo[l.po_id] = [];
            linesByPo[l.po_id].push(l);
          }

          const combined = (pos.results as any[]).map(po => ({
            ...po,
            lines: linesByPo[po.id] || []
          }));

          // Calculate project procurement costs
          const projectCosts = await env.DB.prepare(`
            SELECT p.id, p.reference, p.name, SUM(po.total_amount) as total_procured_cost, COUNT(po.id) as po_count
            FROM panel_projects p
            LEFT JOIN purchase_orders po ON p.id = po.project_id
            GROUP BY p.id
          `).all();

          return Response.json({ success: true, data: combined, orders: combined, project_costs: projectCosts.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body: any = await request.json();
          const poId = crypto.randomUUID();
          const countRes = await env.DB.prepare('SELECT COUNT(*) as c FROM purchase_orders').first();
          const poNum = `PO-2026-${String(Number(countRes?.c || 0) + 1).padStart(4, '0')}`;
          const lines: any[] = body.lines || [];

          let total = 0;
          for (const l of lines) {
            total += (Number(l.quantity || 1) * Number(l.unit_price || 0));
          }

          await env.DB.prepare(`
            INSERT INTO purchase_orders (id, po_number, supplier_name, project_id, total_amount, currency, status, order_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).bind(
            poId,
            poNum,
            body.supplier_name || 'ABB Global',
            body.project_id || null,
            total,
            body.currency || 'SAR',
            'confirmed'
          ).run();

          for (const l of lines) {
            await env.DB.prepare(`
              INSERT INTO purchase_order_lines (id, po_id, item_id, item_description, quantity, unit_price, total_price)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
              crypto.randomUUID(),
              poId,
              l.item_id || null,
              l.item_description || 'Switchgear Component',
              Number(l.quantity || 1),
              Number(l.unit_price || 0),
              Number(l.quantity || 1) * Number(l.unit_price || 0)
            ).run();
          }

          return Response.json({ success: true, po_id: poId, po_number: poNum, total_amount: total }, { headers: corsHeaders, status: 201 });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return Response.json({ success: false, error: 'PO ID required' }, { headers: corsHeaders, status: 400 });
          await env.DB.prepare('DELETE FROM purchase_order_lines WHERE po_id = ?').bind(id).run();
          await env.DB.prepare('DELETE FROM purchase_orders WHERE id = ?').bind(id).run();
          return Response.json({ success: true, message: 'Purchase order deleted successfully' }, { headers: corsHeaders });
        }
      }

      // 7. Warehouse & Inventory Items (CRUD + Assign to User for Project)
      if (pathname === '/api/inventory') {
        if (method === 'GET') {
          const res = await env.DB.prepare('SELECT * FROM inventory_items ORDER BY description ASC').all();
          return Response.json({ success: true, items: res.results, data: res.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body: any = await request.json();
          const id = crypto.randomUUID();

          await env.DB.prepare(`
            INSERT INTO inventory_items (
              id, sku, barcode, description, description_ar, category, uom,
              qty_on_hand, qty_reserved, qty_available, reorder_threshold, purchase_cost,
              warehouse_location, supplier_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            body.sku || `SKU-${Date.now().toString().slice(-4)}`,
            body.barcode || `BAR-${Date.now().toString().slice(-6)}`,
            body.description,
            body.description_ar || body.description,
            body.category || 'raw_materials',
            body.uom || 'PCS',
            body.qty_on_hand ? Number(body.qty_on_hand) : 50,
            0,
            body.qty_on_hand ? Number(body.qty_on_hand) : 50,
            body.reorder_threshold ? Number(body.reorder_threshold) : 10,
            body.purchase_cost ? Number(body.purchase_cost) : 100,
            body.warehouse_location || 'Zone A - Main Warehouse',
            body.supplier_name || 'Schneider / ABB'
          ).run();

          return Response.json({ success: true, id, ...body }, { headers: corsHeaders, status: 201 });
        }
        if (method === 'PUT' || method === 'PATCH') {
          const body: any = await request.json();
          if (!body.id) return Response.json({ success: false, error: 'Item ID required' }, { headers: corsHeaders, status: 400 });

          // Assign to Project / User
          if (body.action === 'assign_to_user_project') {
            const qtyNum = Number(body.quantity || 1);
            const item: any = await env.DB.prepare('SELECT * FROM inventory_items WHERE id = ?').bind(body.id).first();
            if (!item) return Response.json({ success: false, error: 'Item not found' }, { headers: corsHeaders, status: 404 });
            if (Number(item.qty_on_hand) < qtyNum) {
              return Response.json({ success: false, error: 'Insufficient stock in warehouse' }, { headers: corsHeaders, status: 400 });
            }

            const newBalance = Number(item.qty_on_hand) - qtyNum;
            await env.DB.prepare('UPDATE inventory_items SET qty_on_hand = ?, qty_available = ? WHERE id = ?')
              .bind(newBalance, newBalance, body.id).run();

            return Response.json({ success: true, message: `Successfully issued ${qtyNum} units to project`, balance: newBalance }, { headers: corsHeaders });
          }

          // Edit Item
          await env.DB.prepare(`
            UPDATE inventory_items
            SET sku = COALESCE(?, sku),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                qty_on_hand = COALESCE(?, qty_on_hand),
                qty_available = COALESCE(?, qty_on_hand),
                reorder_threshold = COALESCE(?, reorder_threshold),
                purchase_cost = COALESCE(?, purchase_cost),
                warehouse_location = COALESCE(?, warehouse_location)
            WHERE id = ?
          `).bind(
            body.sku || null,
            body.description || null,
            body.category || null,
            body.qty_on_hand !== undefined ? Number(body.qty_on_hand) : null,
            body.qty_on_hand !== undefined ? Number(body.qty_on_hand) : null,
            body.reorder_threshold !== undefined ? Number(body.reorder_threshold) : null,
            body.purchase_cost !== undefined ? Number(body.purchase_cost) : null,
            body.warehouse_location || null,
            body.id
          ).run();

          return Response.json({ success: true, message: 'Item updated successfully' }, { headers: corsHeaders });
        }
        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) return Response.json({ success: false, error: 'Item ID required' }, { headers: corsHeaders, status: 400 });
          await env.DB.prepare('DELETE FROM purchase_order_lines WHERE item_id = ?').bind(id).run();
          await env.DB.prepare('DELETE FROM inventory_items WHERE id = ?').bind(id).run();
          return Response.json({ success: true, message: 'Item deleted successfully' }, { headers: corsHeaders });
        }
      }

      // 7.5 Auth API (Login, Roles, Permissions)
      if (pathname === '/api/auth/login') {
        if (method === 'POST') {
          const body: any = await request.json();
          const email = (body.email || '').trim().toLowerCase();
          const password = body.password;
          const role = body.role;

          let profile: any = null;
          if (email) {
            profile = await env.DB.prepare('SELECT * FROM profiles WHERE LOWER(email) = ?').bind(email).first();
          } else if (role) {
            profile = await env.DB.prepare('SELECT * FROM profiles WHERE role = ? OR role = "system_admin" ORDER BY created_at ASC').bind(role).first();
          }

          if (!profile) {
            return Response.json({ success: false, error: 'User account not found' }, { headers: corsHeaders, status: 401 });
          }

          const isManager = ['system_admin', 'company_owner', 'general_manager', 'admin'].includes(profile.role);
          const perms = isManager ? {
            can_add: true, can_edit: true, can_delete: true, manage_users: true,
            manage_production: true, manage_sales: true, manage_warehouse: true, manage_finance: true, full_access: true
          } : {
            can_add: profile.role !== 'technician', can_edit: true, can_delete: false, manage_users: false
          };

          const userPayload = {
            id: profile.id,
            user_code: profile.user_code || `EMP-${profile.id.slice(-4)}`,
            full_name: profile.full_name,
            full_name_ar: profile.full_name_ar || profile.full_name,
            email: profile.email,
            role: profile.role,
            department: profile.department,
            phone: profile.phone || '',
            reward_points: profile.reward_points || 0,
            is_manager: isManager,
            permissions: perms
          };

          return Response.json({ success: true, message: 'Login successful', user: userPayload }, {
            headers: {
              ...corsHeaders,
              'Set-Cookie': `almasar_auth_user=${encodeURIComponent(JSON.stringify(userPayload))}; Path=/; SameSite=Lax; Max-Age=2592000`
            }
          });
        }
      }

      if (pathname === '/api/auth/me') {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(/almasar_auth_user=([^;]+)/);
        if (match) {
          try {
            const user = JSON.parse(decodeURIComponent(match[1]));
            return Response.json({ success: true, user }, { headers: corsHeaders });
          } catch (e) {}
        }
        const manager = await env.DB.prepare('SELECT * FROM profiles WHERE email = "manager@almasar-switchgear.com" OR role = "system_admin" LIMIT 1').first();
        if (manager) {
          return Response.json({
            success: true,
            user: {
              id: manager.id,
              user_code: manager.user_code || 'EMP-0001',
              full_name: manager.full_name,
              full_name_ar: manager.full_name_ar || manager.full_name,
              email: manager.email,
              role: manager.role,
              department: manager.department,
              is_manager: true,
              permissions: { can_add: true, can_edit: true, can_delete: true, manage_users: true, manage_production: true, manage_sales: true, manage_warehouse: true, manage_finance: true, full_access: true }
            }
          }, { headers: corsHeaders });
        }
        return Response.json({ success: false, user: null }, { headers: corsHeaders });
      }

      if (pathname === '/api/auth/logout') {
        return Response.json({ success: true, message: 'Logged out' }, {
          headers: {
            ...corsHeaders,
            'Set-Cookie': 'almasar_auth_user=; Path=/; Max-Age=0'
          }
        });
      }

      // 8. Users & Roles Management (Manager Add, Edit, Delete, Permissions)
      if (pathname === '/api/users' || pathname === '/api/hr') {
        if (method === 'GET') {
          const users = await env.DB.prepare(`
            SELECT p.*, e.job_title, e.annual_leave_balance, COALESCE(e.employment_status, 'active') as employment_status
            FROM profiles p
            LEFT JOIN employees e ON p.id = e.profile_id
            ORDER BY p.full_name ASC
          `).all();
          return Response.json({ success: true, users: users.results, data: users.results }, { headers: corsHeaders });
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
          try {
            await env.DB.prepare(`
              INSERT INTO employees (id, employee_code, profile_id, full_name, full_name_ar, department, job_title, employment_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
            `).bind(
              crypto.randomUUID(), userCode, id, body.full_name, body.full_name_ar || body.full_name,
              body.department || 'Production', body.job_title || body.role || 'technician'
            ).run();
          } catch (e) {
            console.warn('Employee profile created, employee record skipped:', e);
          }

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

          try {
            await env.DB.prepare(`
              UPDATE employees
              SET full_name = COALESCE(?, full_name),
                  department = COALESCE(?, department),
                  job_title = COALESCE(?, job_title)
              WHERE profile_id = ?
            `).bind(
              body.full_name || null,
              body.department || null,
              body.job_title || null,
              body.id
            ).run();
          } catch (e) {
            // ignore employee update error
          }

          return Response.json({ success: true, message: 'User updated successfully' }, { headers: corsHeaders });
        }

        if (method === 'DELETE') {
          const id = url.searchParams.get('id');
          if (!id) {
            return Response.json({ success: false, error: 'User ID parameter is required' }, { headers: corsHeaders, status: 400 });
          }

          await env.DB.prepare('DELETE FROM employees WHERE profile_id = ? OR id = ?').bind(id, id).run();
          await env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(id).run();

          return Response.json({ success: true, message: 'User deleted successfully' }, { headers: corsHeaders });
        }
      }

      // 9. CRM / Sales & Templates API
      if (pathname === '/api/crm' || pathname === '/api/sales') {
        const view = url.searchParams.get('view');
        if (view === 'templates') {
          const res = await env.DB.prepare('SELECT * FROM project_templates ORDER BY created_at ASC').all();
          return Response.json({ success: true, data: res.results }, { headers: corsHeaders });
        }
        if (method === 'GET') {
          const res = await env.DB.prepare('SELECT * FROM crm_leads ORDER BY created_at DESC').all();
          return Response.json({ success: true, leads: res.results, data: res.results }, { headers: corsHeaders });
        }
        if (method === 'PATCH') {
          const body: any = await request.json();
          await env.DB.prepare(`
            UPDATE crm_leads
            SET sales_status = COALESCE(?, sales_status),
                outcome = COALESCE(?, outcome),
                product_category = COALESCE(?, product_category),
                name = COALESCE(?, name),
                customer_name = COALESCE(?, customer_name),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(body.sales_status || null, body.outcome || null, body.product_category || null, body.name || null, body.customer_name || null, body.id).run();
          return Response.json({ success: true }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const body: any = await request.json();
          const id = crypto.randomUUID();
          const countRes = await env.DB.prepare('SELECT COUNT(*) as c FROM crm_leads').first();
          const ref = `REF-2026-${String(Number(countRes?.c || 0) + 1).padStart(4, '0')}`;
          await env.DB.prepare(`
            INSERT INTO crm_leads (
              id, reference, name, customer_name, company, expected_revenue,
              product_category, outcome, sales_status, description, state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'won')
          `).bind(
            id, ref, body.name, body.customer_name || 'Customer', body.company || body.customer_name || '',
            body.expected_revenue ? Number(body.expected_revenue) : 0,
            body.product_category || 'electrical_panels',
            body.outcome || 'won',
            body.sales_status || 'under_manufacturing',
            body.description || ''
          ).run();
          return Response.json({ success: true, data: { id, reference: ref, ...body } }, { headers: corsHeaders });
        }
      }

      // 10. Production Catalogue & Batches API
      if (pathname === '/api/production/catalogue') {
        if (method === 'GET') {
          const res = await env.DB.prepare('SELECT * FROM panel_catalogue ORDER BY panel_code ASC').all();
          return Response.json({ success: true, data: res.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const b: any = await request.json();
          const id = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO panel_catalogue (id, panel_code, name, name_ar, width_mm, height_mm, thickness_mm, material, standard_uom)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(id, b.panel_code, b.name, b.name_ar || b.name, b.width_mm || 800, b.height_mm || 1200, b.thickness_mm || 2.0, b.material || 'Steel', b.standard_uom || 'unit').run();
          return Response.json({ success: true, data: { id, ...b } }, { headers: corsHeaders, status: 201 });
        }
      }

      if (pathname === '/api/production/batches') {
        if (method === 'GET') {
          const res = await env.DB.prepare(`
            SELECT b.*, c.panel_code, c.name as panel_name, c.name_ar as panel_name_ar,
                   c.width_mm, c.height_mm, c.thickness_mm, c.material,
                   p.reference as project_reference, p.name as project_name,
                   emp.full_name as responsible_name
            FROM production_batches b
            LEFT JOIN panel_catalogue c ON b.panel_id = c.id
            LEFT JOIN panel_projects p ON b.linked_project_id = p.id
            LEFT JOIN profiles emp ON b.responsible_employee_id = emp.id
            ORDER BY b.created_at DESC
          `).all();
          return Response.json({ success: true, data: res.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const b: any = await request.json();
          const id = crypto.randomUUID();
          const count: any = await env.DB.prepare('SELECT COUNT(*) as c FROM production_batches').first();
          const batchNum = `BAT-2026-${String(Number(count?.c || 0) + 1).padStart(4, '0')}`;
          await env.DB.prepare(`
            INSERT INTO production_batches (
              id, batch_number, panel_id, planned_qty, produced_qty, scrap_qty,
              stage, priority, linked_project_id, target_completion_date
            ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
          `).bind(
            id, batchNum, b.panel_id, b.planned_qty || 1,
            b.stage || 'cutting', b.priority || 'medium',
            b.linked_project_id || null, b.target_completion_date || null
          ).run();
          return Response.json({ success: true, data: { id, batch_number: batchNum, ...b } }, { headers: corsHeaders, status: 201 });
        }
      }

      // 11. QC Inspections API
      if (pathname === '/api/qc') {
        if (method === 'GET') {
          const res = await env.DB.prepare(`
            SELECT q.*, p.reference as project_reference, p.name as project_name,
                   o.order_number, o.item_description, b.batch_number,
                   insp.full_name as inspector_name
            FROM qc_queue q
            LEFT JOIN panel_projects p ON q.project_id = p.id
            LEFT JOIN production_orders o ON q.order_id = o.id
            LEFT JOIN production_batches b ON q.batch_id = b.id
            LEFT JOIN profiles insp ON q.inspected_by = insp.id
            ORDER BY q.created_at DESC
          `).all();
          return Response.json({ success: true, data: res.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const b: any = await request.json();
          const id = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO qc_queue (id, order_id, batch_id, project_id, department, status, checklist_results, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(id, b.order_id || null, b.batch_id || null, b.project_id || null, b.department || 'Assembly', b.status || 'pending', JSON.stringify(b.checklist || {}), b.notes || '').run();
          return Response.json({ success: true, data: { id, ...b } }, { headers: corsHeaders, status: 201 });
        }
      }

      // 12. Finance & Salaries API
      if (pathname === '/api/finance') {
        const view = url.searchParams.get('view');
        if (view === 'salaries') {
          const res = await env.DB.prepare(`
            SELECT s.*, emp.full_name as employee_name, emp.full_name_ar as employee_name_ar, emp.department
            FROM employee_salaries s
            JOIN profiles emp ON s.employee_id = emp.id
            ORDER BY s.period_month DESC, emp.full_name ASC
          `).all();
          return Response.json({ success: true, data: res.results }, { headers: corsHeaders });
        }
        if (view === 'advances') {
          const res = await env.DB.prepare(`
            SELECT a.*, emp.full_name as employee_name, emp.full_name_ar as employee_name_ar
            FROM employee_advances a
            JOIN profiles emp ON a.employee_id = emp.id
            ORDER BY a.request_date DESC
          `).all();
          return Response.json({ success: true, data: res.results }, { headers: corsHeaders });
        }
        const res = await env.DB.prepare('SELECT * FROM financial_expenses ORDER BY transaction_date DESC').all();
        return Response.json({ success: true, data: res.results }, { headers: corsHeaders });
      }

      // 13. Time Tracking API
      if (pathname === '/api/time-tracking') {
        if (method === 'GET') {
          const res = await env.DB.prepare(`
            SELECT t.*, prof.full_name as technician_name, task.title as task_title
            FROM time_logs t
            LEFT JOIN profiles prof ON t.employee_id = prof.id
            LEFT JOIN technician_tasks task ON t.task_id = task.id
            ORDER BY t.start_time DESC
          `).all();
          return Response.json({ success: true, data: res.results }, { headers: corsHeaders });
        }
        if (method === 'POST') {
          const b: any = await request.json();
          const id = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO time_logs (id, task_id, employee_id, start_time, duration_seconds, state)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(id, b.task_id || null, b.employee_id || b.technician_id || null, b.start_time || new Date().toISOString(), (b.duration_hours || 1) * 3600, 'completed').run();
          return Response.json({ success: true, data: { id, ...b } }, { headers: corsHeaders, status: 201 });
        }
      }

      // 404 for unknown endpoints
      return Response.json({ success: false, error: 'Endpoint not found' }, { headers: corsHeaders, status: 404 });
    } catch (error: any) {
      return Response.json({ success: false, error: error.message }, { headers: corsHeaders, status: 500 });
    }
  }
};

function getErpPortalHtml(stats: any, initialRoute: string = '/dashboard'): string {
  const pCount = stats?.projects_count || 15;
  const uCount = stats?.users_count || 31;
  const oCount = stats?.orders_count || 6;
  const iCount = stats?.items_count || 57;
  const procCount = stats?.procurement_count || 11;
  const tCount = stats?.tasks_count || 43;
  const crmCount = stats?.crm_count || 44;

  // Determine active section based on initial route
  let activeTab = 'dashboard';
  if (initialRoute.includes('project')) activeTab = 'projects';
  else if (initialRoute.includes('user') || initialRoute.includes('hr')) activeTab = 'hr';
  else if (initialRoute.includes('inventory') || initialRoute.includes('warehouse')) activeTab = 'warehouse';
  else if (initialRoute.includes('procurement')) activeTab = 'procurement';
  else if (initialRoute.includes('task')) activeTab = 'tasks';
  else if (initialRoute.includes('crm')) activeTab = 'crm';
  else if (initialRoute.includes('production')) activeTab = 'production';
  else if (initialRoute.includes('qc')) activeTab = 'qc';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" id="htmlRoot">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>المسار | نظام إدارة المصنع (Al-Masar ERP)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #060a14;
      --bg-surface: #0c1322;
      --bg-card: #121c32;
      --card-border: rgba(255, 255, 255, 0.07);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --cyan: #38bdf8;
      --cyan-glow: rgba(56, 189, 248, 0.25);
      --gold: #f59e0b;
      --gold-glow: rgba(245, 158, 11, 0.3);
      --emerald: #10b981;
      --rose: #f43f5e;
      --purple: #a855f7;
      --sidebar-width: 260px;
      --font-ar: 'Cairo', system-ui, sans-serif;
      --font-en: 'Inter', system-ui, sans-serif;
    }

    /* Light Theme Tokens */
    :root[data-theme="light"], html[data-theme="light"], body.light-theme, [data-theme="light"] {
      --bg-base: #f4f6fa;
      --bg-surface: #ffffff;
      --bg-card: #ffffff;
      --card-border: #cbd5e1;
      --text-primary: #0f172a;
      --text-secondary: #334155;
      --text-muted: #64748b;
      --cyan: #0284c7;
      --cyan-glow: rgba(2, 132, 199, 0.15);
      --gold: #b45309;
      --gold-glow: rgba(180, 83, 9, 0.15);
      --emerald: #16a34a;
      --rose: #dc2626;
      --purple: #7c3aed;
    }

    [data-theme="light"] .topbar {
      background: rgba(255, 255, 255, 0.95);
      border-bottom-color: #e2e8f0;
    }
    [data-theme="light"] .topbar-title {
      color: #0f172a;
    }
    [data-theme="light"] .btn-top {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }
    [data-theme="light"] .btn-top:hover {
      background: #f1f5f9;
    }
    [data-theme="light"] .dept-card,
    [data-theme="light"] .main-kpi,
    [data-theme="light"] .panel-card {
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    }
    [data-theme="light"] .main-kpi-val {
      color: #0f172a;
    }
    [data-theme="light"] .panel-title {
      color: #0f172a;
    }
    [data-theme="light"] th {
      background: #f8fafc;
      border-bottom-color: #cbd5e1;
      color: #64748b;
    }
    [data-theme="light"] td {
      border-bottom-color: #e2e8f0;
      color: #0f172a;
    }
    [data-theme="light"] tr:hover td {
      background: #f8fafc;
    }
    [data-theme="light"] .sidebar-header {
      border-bottom-color: #e2e8f0;
    }
    [data-theme="light"] .sidebar-brand h2 {
      color: #0f172a;
    }
    [data-theme="light"] .nav-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    [data-theme="light"] .nav-item.active {
      background: rgba(2, 132, 199, 0.1);
      color: var(--cyan);
    }
    [data-theme="light"] .sidebar-footer {
      background: #f8fafc;
      border-top-color: #e2e8f0;
    }
    [data-theme="light"] .user-info h4 {
      color: #0f172a;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: var(--font-ar);
      min-height: 100vh;
      overflow-x: hidden;
      display: flex;
    }
    [dir="ltr"] body { font-family: var(--font-en); }

    /* ================= APP SHELL & SIDEBAR ================= */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-surface);
      border-left: 1px solid var(--card-border);
      position: fixed;
      top: 0;
      bottom: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      z-index: 100;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    [dir="ltr"] .sidebar {
      right: auto;
      left: 0;
      border-left: none;
      border-right: 1px solid var(--card-border);
    }
    .sidebar-header {
      padding: 20px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--card-border);
    }
    .sidebar-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #0284c7, #38bdf8);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 20px;
      font-weight: 800;
      box-shadow: 0 4px 12px var(--cyan-glow);
    }
    .sidebar-brand h2 {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }
    .sidebar-brand p {
      font-size: 11px;
      color: var(--text-muted);
    }
    .sidebar-menu {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .menu-section-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      padding: 0 8px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      user-select: none;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .nav-item.active {
      background: rgba(56, 189, 248, 0.12);
      color: var(--cyan);
      border-right: 3px solid var(--cyan);
    }
    [dir="ltr"] .nav-item.active {
      border-right: none;
      border-left: 3px solid var(--cyan);
    }
    .nav-icon {
      font-size: 16px;
      width: 20px;
      text-align: center;
    }
    .sidebar-footer {
      padding: 14px 16px;
      border-top: 1px solid var(--card-border);
      background: rgba(0, 0, 0, 0.2);
    }
    .user-profile-badge {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #2563eb;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }
    .user-info h4 { font-size: 13px; font-weight: 700; color: #fff; }
    .user-info p { font-size: 11px; color: var(--text-muted); }

    /* ================= MAIN CONTENT ================= */
    .main-wrapper {
      flex: 1;
      margin-right: var(--sidebar-width);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    [dir="ltr"] .main-wrapper {
      margin-right: 0;
      margin-left: var(--sidebar-width);
    }
    .topbar {
      padding: 16px 28px;
      background: rgba(12, 19, 34, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 40;
      gap: 16px;
    }
    .topbar-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .badge-points {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #000;
      font-weight: 700;
      font-size: 12px;
      padding: 5px 12px;
      border-radius: 9999px;
      box-shadow: 0 2px 10px var(--gold-glow);
    }
    .badge-live {
      font-size: 12px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-top {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--card-border);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      transition: all 0.2s;
    }
    .btn-top:hover { background: rgba(255, 255, 255, 0.1); }
    .btn-top.active { background: rgba(56, 189, 248, 0.2); border-color: var(--cyan); color: var(--cyan); }

    .content-body {
      padding: 24px 28px 60px;
      flex: 1;
    }

    /* ================= WARNING BANNER ================= */
    .shortage-banner {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 12px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 14px;
      flex-wrap: wrap;
    }
    .shortage-msg {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }
    .btn-danger-sm {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-danger-sm:hover { background: #ef4444; color: #fff; }

    /* ================= 5 MAIN KPI CARDS ================= */
    .kpi-row-5 {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    @media (max-width: 1100px) {
      .kpi-row-5 { grid-template-columns: repeat(2, 1fr); }
    }
    .main-kpi {
      background: var(--bg-card);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 18px 16px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .main-kpi::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--line-color, var(--cyan));
    }
    .main-kpi-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .main-kpi-val {
      font-size: 32px;
      font-weight: 800;
      color: #fff;
      line-height: 1;
      margin-bottom: 6px;
    }
    .main-kpi-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 600;
    }

    /* ================= 4 DEPT CARDS ================= */
    .kpi-row-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    @media (max-width: 1000px) {
      .kpi-row-4 { grid-template-columns: repeat(2, 1fr); }
    }
    .dept-card {
      background: var(--bg-card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .dept-card-header {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .dept-card-val {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .dept-card-sub {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* ================= 2 BOTTOM PANELS ================= */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) {
      .bottom-grid { grid-template-columns: 1fr; }
    }
    .panel-card {
      background: var(--bg-card);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
    }
    .panel-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff;
    }

    /* ================= DATA VIEWS (TABLES) ================= */
    .view-container {
      display: none;
    }
    .view-container.active {
      display: block;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
    }
    [dir="ltr"] table { text-align: left; }
    th {
      padding: 12px 14px;
      font-size: 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
      background: rgba(255, 255, 255, 0.02);
    }
    td {
      padding: 12px 14px;
      font-size: 13px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
    }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-done { background: rgba(16, 185, 129, 0.18); color: #34d399; }
    .badge-new { background: rgba(168, 85, 247, 0.18); color: #c084fc; }
    .badge-prog { background: rgba(56, 189, 248, 0.18); color: #38bdf8; }
    .badge-gold { background: rgba(245, 158, 11, 0.18); color: #fbbf24; }

    /* TV Mode */
    body.tv-mode .sidebar { display: none; }
    body.tv-mode .main-wrapper { margin-right: 0 !important; margin-left: 0 !important; }
    body.tv-mode .main-kpi-val { font-size: 44px; }
  </style>
</head>
<body>
  <!-- ================= RIGHT-HAND SIDEBAR ================= -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">⚡</div>
      <div class="sidebar-brand">
        <h2 id="brandTitle">المسار</h2>
        <p id="brandSub">نظام إدارة المصنع</p>
      </div>
    </div>

    <div class="sidebar-menu">
      <!-- Section 1 -->
      <div>
        <div class="menu-section-title" id="secOverview">نظرة عامة</div>
        <div class="nav-item ${activeTab === 'dashboard' ? 'active' : ''}" onclick="selectMenu('dashboard', this)">
          <span class="nav-icon">▦</span>
          <span id="navDash">لوحة التحكم</span>
        </div>
        <div class="nav-item ${activeTab === 'projects' ? 'active' : ''}" onclick="selectMenu('projects', this)">
          <span class="nav-icon">🗂</span>
          <span id="navProj">مشاريع اللوحات</span>
        </div>
      </div>

      <!-- Section 2 -->
      <div>
        <div class="menu-section-title" id="secSales">المبيعات والعملاء</div>
        <div class="nav-item ${activeTab === 'crm' ? 'active' : ''}" onclick="selectMenu('crm', this)">
          <span class="nav-icon">💼</span>
          <span id="navCrm">المبيعات / CRM</span>
        </div>
      </div>

      <!-- Section 3 -->
      <div>
        <div class="menu-section-title" id="secProd">الهندسة والتصنيع</div>
        <div class="nav-item" onclick="selectMenu('engineering', this)">
          <span class="nav-icon">📐</span>
          <span id="navEng">الهندسة</span>
        </div>
        <div class="nav-item" onclick="selectMenu('tasks', this)">
          <span class="nav-icon">✅</span>
          <span id="navTasks">المهام والإنتاج</span>
        </div>
        <div class="nav-item" onclick="selectMenu('procurement', this)">
          <span class="nav-icon">🛒</span>
          <span id="navProc">المشتريات</span>
        </div>
        <div class="nav-item ${activeTab === 'warehouse' ? 'active' : ''}" onclick="selectMenu('warehouse', this)">
          <span class="nav-icon">🏭</span>
          <span id="navWare">المستودع</span>
        </div>
        <div class="nav-item ${activeTab === 'production' ? 'active' : ''}" onclick="selectMenu('production', this)">
          <span class="nav-icon">⚙️</span>
          <span id="navProd">الإنتاج (MRP)</span>
        </div>
        <div class="nav-item ${activeTab === 'qc' ? 'active' : ''}" onclick="selectMenu('qc', this)">
          <span class="nav-icon">🔍</span>
          <span id="navQc">ضبط الجودة</span>
        </div>
        <div class="nav-item" onclick="selectMenu('logistics', this)">
          <span class="nav-icon">🚚</span>
          <span id="navLog">اللوجستيات</span>
        </div>
      </div>

      <!-- Section 4 -->
      <div>
        <div class="menu-section-title" id="secFinance">المالية والموارد البشرية</div>
        <div class="nav-item" onclick="selectMenu('accounting', this)">
          <span class="nav-icon">💳</span>
          <span id="navAcc">الفواتير والمحاسبة</span>
        </div>
        <div class="nav-item ${activeTab === 'hr' ? 'active' : ''}" onclick="selectMenu('hr', this)">
          <span class="nav-icon">👥</span>
          <span id="navHr">الموارد البشرية والرواتب</span>
        </div>
      </div>

      <!-- Section 5 -->
      <div>
        <div class="menu-section-title" id="secDocs">الوثائق والدعم الفني</div>
        <div class="nav-item" onclick="selectMenu('dms', this)">
          <span class="nav-icon">📁</span>
          <span id="navDms">إدارة الوثائق والمخططات</span>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="user-profile-badge">
        <div class="user-avatar">P</div>
        <div class="user-info">
          <h4>محمد سالم</h4>
          <p>فني</p>
        </div>
      </div>
    </div>
  </aside>

  <!-- ================= MAIN CONTENT WRAPPER ================= -->
  <div class="main-wrapper">
    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-title" id="pageTitleTxt">لوحة المتابعة المركزية اللحظية للمالك (Real-Time Live Command Center)</div>
      <div class="topbar-actions">
        <div class="badge-points">⭐ 640 نقطة</div>
        <div class="badge-live">
          <span style="color:#10b981;">🟢</span>
          <span id="liveClockTxt">محدث لحظياً: 1:56:11 PM</span>
        </div>
        <button class="btn-top" id="tvBtn" onclick="toggleTvMode()">📺 وضع الشاشات الكبيرة / TV</button>
        <button class="btn-top" id="themeBtn" onclick="toggleThemeMode()">☀️ وضع النهاري</button>
        <button class="btn-top" id="langBtn" onclick="toggleLanguage()">GB English</button>
      </div>
    </header>

    <!-- Main Content Body -->
    <main class="content-body">
      <!-- VIEW: DASHBOARD -->
      <div id="view-dashboard" class="view-container ${activeTab === 'dashboard' ? 'active' : ''}">
        <!-- Shortage Warning Banner -->
        <div class="shortage-banner">
          <div class="shortage-msg">
            <span style="font-size: 20px;">🚨</span>
            <div>
              <strong style="color: #ef4444;" id="bannerTitle">تنبيه نقص في المخزون والمواد الأولية:</strong>
              <span style="color: var(--text-secondary); margin-right: 6px;" id="bannerDesc">SKU-ACB-3200 (OnHand: 8.00), SKU-PLC-S71200 (OnHand: 12.00)</span>
            </div>
          </div>
          <button class="btn-danger-sm" onclick="selectMenu('warehouse', document.querySelector('[onclick*=\"warehouse\"]'))" id="bannerBtn">عرض وإصدار أوامر الشراء</button>
        </div>

        <!-- 5 Main KPI Cards -->
        <div class="kpi-row-5">
          <div class="main-kpi" style="--line-color: #38bdf8;">
            <div class="main-kpi-icon" style="color: #38bdf8;">⚡</div>
            <div class="main-kpi-val">${oCount}</div>
            <div class="main-kpi-label" id="kpi1Lbl">إجمالي أوامر الإنتاج المفتوحة</div>
          </div>
          <div class="main-kpi" style="--line-color: #f59e0b;">
            <div class="main-kpi-icon" style="color: #f59e0b;">⏳</div>
            <div class="main-kpi-val">0</div>
            <div class="main-kpi-label" id="kpi2Lbl">أوامر بانتظار قبول المصنع</div>
          </div>
          <div class="main-kpi" style="--line-color: #3b82f6;">
            <div class="main-kpi-icon" style="color: #3b82f6;">⚙️</div>
            <div class="main-kpi-val">0</div>
            <div class="main-kpi-label" id="kpi3Lbl">قيد التصنيع والتنفيذ الفعلي</div>
          </div>
          <div class="main-kpi" style="--line-color: #f43f5e;">
            <div class="main-kpi-icon" style="color: #f43f5e;">⚠️</div>
            <div class="main-kpi-val">0</div>
            <div class="main-kpi-label" id="kpi4Lbl">أوامر تتطلب إعادة عمل (QC)</div>
          </div>
          <div class="main-kpi" style="--line-color: #10b981;">
            <div class="main-kpi-icon" style="color: #10b981;">🚚</div>
            <div class="main-kpi-val">0</div>
            <div class="main-kpi-label" id="kpi5Lbl">لوحات جاهزة للتسليم والشحن</div>
          </div>
        </div>

        <!-- 4 Department Status Cards -->
        <div class="kpi-row-4">
          <div class="dept-card">
            <div class="dept-card-header">🎨 <span id="dept1Title">قسم الدهان الحراري</span></div>
            <div class="dept-card-val" style="color: #a855f7;">0 لوحة</div>
            <div class="dept-card-sub" id="dept1Sub">بانتظار الطلاء والفحص</div>
          </div>
          <div class="dept-card">
            <div class="dept-card-header">🔍 <span id="dept2Title">فحص الجودة (QC / FAT)</span></div>
            <div class="dept-card-val" style="color: #38bdf8;">0 فحص معلق</div>
            <div class="dept-card-sub" style="color: #f43f5e;" id="dept2Sub">▲ 0 فحص مرفوض</div>
          </div>
          <div class="dept-card">
            <div class="dept-card-header">📍 <span id="dept3Title">المهام الخارجية الميدانية</span></div>
            <div class="dept-card-val" style="color: #06b6d4;">0 موقع نشط</div>
            <div class="dept-card-sub" id="dept3Sub">فرق فنية بمواقع المشاريع</div>
          </div>
          <div class="dept-card">
            <div class="dept-card-header">⏱️ <span id="dept4Title">أوامر متأخرة عن الموعد</span></div>
            <div class="dept-card-val" style="color: #10b981;">0</div>
            <div class="dept-card-sub" id="dept4Sub">جميع الأوامر ضمن الجدول</div>
          </div>
        </div>

        <!-- 2 Bottom Panels -->
        <div class="bottom-grid">
          <div class="panel-card">
            <div class="panel-title">📊 <span id="bot1Title">توزيع عبء العمل والإنتاجية حسب الأقسام</span></div>
            <div style="height: 180px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px; border: 1px dashed var(--card-border); border-radius: 10px;">
              <span>أقسام تشكيل النحاس (Busbar)، تجميع الهياكل، وتمديد الأسلاك ضمن السعة التشغيلية المثالية</span>
            </div>
          </div>
          <div class="panel-card">
            <div class="panel-title">⚡ <span id="bot2Title">آخر التحديثات والتنقلات المرحلية اللحظية</span></div>
            <div style="height: 180px; display: flex; flex-direction: column; justify-content: center; gap: 10px; color: var(--text-secondary); font-size: 13px;">
              <div style="padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 8px; display: flex; justify-content: space-between;">
                <span>مشروع <strong>PRJ-2026-0015 (ABB)</strong> جاهز للاختبار النهائي</span>
                <span style="color: var(--emerald);">منذ 10 دقائق</span>
              </div>
              <div style="padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 8px; display: flex; justify-content: space-between;">
                <span>تم إدراج <strong>15 مشروع لوحات</strong> في قاعدة بيانات Cloudflare D1</span>
                <span style="color: var(--cyan);">مباشر</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW: PROJECTS -->
      <div id="view-projects" class="view-container ${activeTab === 'projects' ? 'active' : ''}">
        <div class="panel-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: #fff;">مشاريع لوحات التوزيع المسجلة (${pCount})</h3>
              <p style="font-size: 12px; color: var(--text-muted);">بيانات مباشرة من Cloudflare D1 (almasar-db)</p>
            </div>
            <button class="btn-top" onclick="fetchProjects()">↻ تحديث</button>
          </div>
          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>الرمز</th>
                  <th>اسم المشروع</th>
                  <th>العميل</th>
                  <th>الموقع</th>
                  <th>القيمة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody id="projTbody">
                <tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">جاري تحميل المشاريع...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW: WAREHOUSE / INVENTORY -->
      <div id="view-warehouse" class="view-container ${activeTab === 'warehouse' ? 'active' : ''}">
        <div class="panel-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: #fff;">المستودع والمخزون (${iCount})</h3>
              <p style="font-size: 12px; color: var(--text-muted);">مستويات القواطع، الأسلاك، وقضبان النحاس</p>
            </div>
            <button class="btn-top" onclick="fetchInventory()">↻ تحديث</button>
          </div>
          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>الباركود</th>
                  <th>الوصف</th>
                  <th>الفئة</th>
                  <th>الكمية المتوفرة</th>
                  <th>حد الطلب</th>
                  <th>سعر الوحدة</th>
                </tr>
              </thead>
              <tbody id="invTbody">
                <tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">جاري تحميل المخزون...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW: HR / USERS -->
      <div id="view-hr" class="view-container ${activeTab === 'hr' ? 'active' : ''}">
        <div class="panel-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: #fff;">الموارد البشرية والمستخدمون (${uCount})</h3>
              <p style="font-size: 12px; color: var(--text-muted);">حسابات الموظفين والصلاحيات المسجلة</p>
            </div>
            <button class="btn-top" onclick="fetchUsers()">↻ تحديث</button>
          </div>
          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>الاسم الكامل</th>
                  <th>البريد</th>
                  <th>القسم</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody id="usersTbody">
                <tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">جاري تحميل الموظفين...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW: PROCUREMENT -->
      <div id="view-procurement" class="view-container ${activeTab === 'procurement' ? 'active' : ''}">
        <div class="panel-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: #fff;">أوامر الشراء والمشتريات (${procCount})</h3>
              <p style="font-size: 12px; color: var(--text-muted);">سجل طلبات التوريد المباشرة للمشاريع من Cloudflare D1</p>
            </div>
            <button class="btn-top" onclick="fetchProcurement()">↻ تحديث</button>
          </div>
          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>رقم أمر الشراء</th>
                  <th>المورد</th>
                  <th>تاريخ الإصدار</th>
                  <th>إجمالي المبلغ</th>
                  <th>المشروع المرتبط</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody id="procTbody">
                <tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">جاري تحميل المشتريات...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW: TASKS -->
      <div id="view-tasks" class="view-container ${activeTab === 'tasks' ? 'active' : ''}">
        <div class="panel-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: #fff;">مهام الفنيين ومسار العمل (${tCount})</h3>
              <p style="font-size: 12px; color: var(--text-muted);">تتبع إنجاز المهام في خطوط الإنتاج من Cloudflare D1</p>
            </div>
            <button class="btn-top" onclick="fetchTasks()">↻ تحديث</button>
          </div>
          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>عنوان المهمة</th>
                  <th>القسم</th>
                  <th>المشروع</th>
                  <th>الفني المكلف</th>
                  <th>الأولوية</th>
                  <th>حالة المسار</th>
                </tr>
              </thead>
              <tbody id="tasksTbody">
                <tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">جاري تحميل المهام...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW: PRODUCTION -->
      <div id="view-production" class="view-container ${activeTab === 'production' ? 'active' : ''}">
        <div class="panel-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: #fff;">أوامر التصنيع والمراحل (${oCount})</h3>
              <p style="font-size: 12px; color: var(--text-muted);">خطوط التصنيع وقص النحاس والتجميع من Cloudflare D1</p>
            </div>
            <button class="btn-top" onclick="fetchProduction()">↻ تحديث</button>
          </div>
          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>رقم أمر التصنيع</th>
                  <th>اسم اللوحة</th>
                  <th>القسم</th>
                  <th>المرحلة الحالية</th>
                  <th>الكمية</th>
                  <th>الدهان الحراري</th>
                </tr>
              </thead>
              <tbody id="prodTbody">
                <tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">جاري تحميل أوامر التصنيع...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW: CRM -->
      <div id="view-crm" class="view-container ${activeTab === 'crm' ? 'active' : ''}">
        <div class="panel-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: #fff;">المبيعات والفرص البيعية CRM (${crmCount})</h3>
              <p style="font-size: 12px; color: var(--text-muted);">العملاء والمشاريع قيد التسعير من Cloudflare D1</p>
            </div>
            <button class="btn-top" onclick="fetchCrm()">↻ تحديث</button>
          </div>
          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>الرقم المرجعي</th>
                  <th>اسم المشروع</th>
                  <th>العميل / الشركة</th>
                  <th>القسم والتصنيف</th>
                  <th>النتيجة</th>
                  <th>الحالة</th>
                  <th>القيمة</th>
                </tr>
              </thead>
              <tbody id="crmTbody">
                <tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">جاري تحميل مشاريع المبيعات والنماذج...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW: OTHER PLACEHOLDERS -->
      <div id="view-generic" class="view-container">
        <div class="panel-card" style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 40px; margin-bottom: 14px;">⚙️</div>
          <h3 id="genericTitle" style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">القسم قيد التشغيل</h3>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">هذا القسم متصل مباشرة بقاعدة بيانات Cloudflare D1 ومتاح للاستخدام.</p>
          <button class="btn-top" onclick="selectMenu('dashboard', document.querySelector('.nav-item'))">العودة للوحة التحكم</button>
        </div>
      </div>
    </main>
  </div>

  <script>
    let currentLang = 'ar';
    let isTv = false;

    // Clock
    function updateClock() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const el = document.getElementById('liveClockTxt');
      if (el) el.innerText = (currentLang === 'ar' ? 'محدث لحظياً: ' : 'Live: ') + timeStr;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Theme Mode (Light / Dark)
    let currentTheme = 'dark';
    try {
      currentTheme = localStorage.getItem('almasar_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    } catch(e) {}

    function applyThemeMode(theme) {
      currentTheme = theme;
      const root = document.getElementById('htmlRoot');
      const btn = document.getElementById('themeBtn');
      if (theme === 'light') {
        if (root) {
          root.setAttribute('data-theme', 'light');
          root.classList.add('light-theme');
        }
        document.body.classList.add('light-theme');
        if (btn) btn.innerText = currentLang === 'ar' ? '🌙 الوضع الليلي' : '🌙 Dark Mode';
      } else {
        if (root) {
          root.setAttribute('data-theme', 'dark');
          root.classList.remove('light-theme');
        }
        document.body.classList.remove('light-theme');
        if (btn) btn.innerText = currentLang === 'ar' ? '☀️ الوضع النهاري' : '☀️ Light Mode';
      }
      try {
        localStorage.setItem('almasar_theme', theme);
      } catch(e) {}
    }

    function toggleThemeMode() {
      applyThemeMode(currentTheme === 'light' ? 'dark' : 'light');
    }

    // Apply theme on load
    applyThemeMode(currentTheme);

    // TV Mode
    function toggleTvMode() {
      isTv = !isTv;
      document.body.classList.toggle('tv-mode', isTv);
      const btn = document.getElementById('tvBtn');
      if (btn) {
        btn.classList.toggle('active', isTv);
        btn.innerText = isTv 
          ? (currentLang === 'ar' ? 'الخروج من وضع الشاشة' : 'Exit TV Mode')
          : (currentLang === 'ar' ? '📺 وضع الشاشات الكبيرة / TV' : '📺 TV Mode');
      }
    }

    // Language Toggle
    function toggleLanguage() {
      const root = document.getElementById('htmlRoot');
      const btn = document.getElementById('langBtn');
      if (currentLang === 'ar') {
        currentLang = 'en';
        root.setAttribute('dir', 'ltr');
        root.setAttribute('lang', 'en');
        btn.innerText = 'العربية';
        document.getElementById('pageTitleTxt').innerText = 'Real-Time Owner & Executive Dashboard (Command Center)';
        document.getElementById('brandTitle').innerText = 'ALMASAR';
        document.getElementById('brandSub').innerText = 'Factory Management';
        document.getElementById('secOverview').innerText = 'OVERVIEW';
        document.getElementById('navDash').innerText = 'Dashboard';
        document.getElementById('navProj').innerText = 'Panel Projects';
        document.getElementById('secSales').innerText = 'SALES & CRM';
        document.getElementById('navCrm').innerText = 'Sales / CRM';
        document.getElementById('secProd').innerText = 'ENGINEERING & PRODUCTION';
        document.getElementById('navEng').innerText = 'Engineering';
        document.getElementById('navTasks').innerText = 'Tasks & Production';
        document.getElementById('navProc').innerText = 'Procurement';
        document.getElementById('navWare').innerText = 'Warehouse';
        document.getElementById('navProd').innerText = 'Production (MRP)';
        document.getElementById('navQc').innerText = 'Quality Control';
        document.getElementById('navLog').innerText = 'Logistics';
        document.getElementById('secFinance').innerText = 'FINANCE & HR';
        document.getElementById('navAcc').innerText = 'Invoicing & Accounting';
        document.getElementById('navHr').innerText = 'HR & Payroll';
        document.getElementById('secDocs').innerText = 'DOCUMENTS';
        document.getElementById('navDms').innerText = 'DMS Documents';
        document.getElementById('kpi1Lbl').innerText = 'Total Open Production Orders';
        document.getElementById('kpi2Lbl').innerText = 'Orders Awaiting Acceptance';
        document.getElementById('kpi3Lbl').innerText = 'Orders Under Manufacturing';
        document.getElementById('kpi4Lbl').innerText = 'Orders Requiring QC Rework';
        document.getElementById('kpi5Lbl').innerText = 'Panels Ready for Delivery';
        const tBtn = document.getElementById('themeBtn');
        if (tBtn) tBtn.innerText = currentTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
      } else {
        currentLang = 'ar';
        root.setAttribute('dir', 'rtl');
        root.setAttribute('lang', 'ar');
        btn.innerText = 'GB English';
        document.getElementById('pageTitleTxt').innerText = 'لوحة المتابعة المركزية اللحظية للمالك (Real-Time Live Command Center)';
        document.getElementById('brandTitle').innerText = 'المسار';
        document.getElementById('brandSub').innerText = 'نظام إدارة المصنع';
        document.getElementById('secOverview').innerText = 'نظرة عامة';
        document.getElementById('navDash').innerText = 'لوحة التحكم';
        document.getElementById('navProj').innerText = 'مشاريع اللوحات';
        document.getElementById('secSales').innerText = 'المبيعات والعملاء';
        document.getElementById('navCrm').innerText = 'المبيعات / CRM';
        document.getElementById('secProd').innerText = 'الهندسة والتصنيع';
        document.getElementById('navEng').innerText = 'الهندسة';
        document.getElementById('navTasks').innerText = 'المهام والإنتاج';
        document.getElementById('navProc').innerText = 'المشتريات';
        document.getElementById('navWare').innerText = 'المستودع';
        document.getElementById('navProd').innerText = 'الإنتاج (MRP)';
        document.getElementById('navQc').innerText = 'ضبط الجودة';
        document.getElementById('navLog').innerText = 'اللوجستيات';
        document.getElementById('secFinance').innerText = 'المالية والموارد البشرية';
        document.getElementById('navAcc').innerText = 'الفواتير والمحاسبة';
        document.getElementById('navHr').innerText = 'الموارد البشرية والرواتب';
        document.getElementById('secDocs').innerText = 'الوثائق والدعم الفني';
        document.getElementById('navDms').innerText = 'إدارة الوثائق والمخططات';
        document.getElementById('kpi1Lbl').innerText = 'إجمالي أوامر الإنتاج المفتوحة';
        document.getElementById('kpi2Lbl').innerText = 'أوامر بانتظار قبول المصنع';
        document.getElementById('kpi3Lbl').innerText = 'قيد التصنيع والتنفيذ الفعلي';
        document.getElementById('kpi4Lbl').innerText = 'أوامر تتطلب إعادة عمل (QC)';
        document.getElementById('kpi5Lbl').innerText = 'لوحات جاهزة للتسليم والشحن';
        const tBtn = document.getElementById('themeBtn');
        if (tBtn) tBtn.innerText = currentTheme === 'light' ? '🌙 الوضع الليلي' : '☀️ الوضع النهاري';
      }
    }

    // Menu Navigation
    function selectMenu(target, el) {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      if (el) el.classList.add('active');

      document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));

      if (target === 'dashboard') {
        document.getElementById('view-dashboard').classList.add('active');
        document.getElementById('pageTitleTxt').innerText = currentLang === 'ar' ? 'لوحة المتابعة المركزية اللحظية للمالك (Real-Time Live Command Center)' : 'Real-Time Owner & Executive Dashboard';
      } else if (target === 'projects') {
        document.getElementById('view-projects').classList.add('active');
        document.getElementById('pageTitleTxt').innerText = currentLang === 'ar' ? 'مشاريع لوحات التوزيع' : 'Panel Projects Management';
        fetchProjects();
      } else if (target === 'procurement') {
        document.getElementById('view-procurement').classList.add('active');
        document.getElementById('pageTitleTxt').innerText = currentLang === 'ar' ? 'أوامر الشراء والمشتريات' : 'Procurement & Purchase Orders';
        fetchProcurement();
      } else if (target === 'tasks') {
        document.getElementById('view-tasks').classList.add('active');
        document.getElementById('pageTitleTxt').innerText = currentLang === 'ar' ? 'مهام الفنيين ومسار العمل' : 'Technician Tasks & Workflow';
        fetchTasks();
      } else if (target === 'warehouse') {
        document.getElementById('view-warehouse').classList.add('active');
        document.getElementById('pageTitleTxt').innerText = currentLang === 'ar' ? 'المستودع والمخزون' : 'Warehouse & Stock Inventory';
        fetchInventory();
      } else if (target === 'production') {
        document.getElementById('view-production').classList.add('active');
        document.getElementById('pageTitleTxt').innerText = currentLang === 'ar' ? 'أوامر التصنيع والمراحل' : 'Production Orders & MRP';
        fetchProduction();
      } else if (target === 'crm') {
        document.getElementById('view-crm').classList.add('active');
        document.getElementById('pageTitleTxt').innerText = currentLang === 'ar' ? 'المبيعات / CRM' : 'Sales & CRM Leads';
        fetchCrm();
      } else if (target === 'hr') {
        document.getElementById('view-hr').classList.add('active');
        document.getElementById('pageTitleTxt').innerText = currentLang === 'ar' ? 'الموارد البشرية والمستخدمون' : 'HR & Team Profiles';
        fetchUsers();
      } else {
        const gen = document.getElementById('view-generic');
        gen.classList.add('active');
        const titles = {
          engineering: currentLang === 'ar' ? 'الهندسة والمخططات' : 'Engineering',
          qc: currentLang === 'ar' ? 'ضبط الجودة وفحص FAT' : 'Quality Control & FAT',
          logistics: currentLang === 'ar' ? 'اللوجستيات والشحن' : 'Logistics',
          accounting: currentLang === 'ar' ? 'الفواتير والمحاسبة' : 'Invoicing & Accounting',
          dms: currentLang === 'ar' ? 'إدارة الوثائق والمخططات' : 'DMS Documents'
        };
        document.getElementById('genericTitle').innerText = titles[target] || target;
        document.getElementById('pageTitleTxt').innerText = titles[target] || target;
      }
    }

    // Live Data Fetchers
    async function fetchProjects() {
      const tbody = document.getElementById('projTbody');
      try {
        const res = await fetch('/api/projects');
        const json = await res.json();
        if (json.success && json.projects) {
          tbody.innerHTML = json.projects.map(p => {
            const isDone = p.state === 'done';
            const isNew = p.state === 'new';
            const badgeClass = isDone ? 'badge-done' : (isNew ? 'badge-new' : 'badge-prog');
            return \`
              <tr>
                <td><strong style="color: var(--gold);">\${p.reference || '—'}</strong></td>
                <td><strong>\${p.name}</strong></td>
                <td>\${p.customer_name || '—'}</td>
                <td>\${p.location || '—'}</td>
                <td>\${Number(p.quotation_amount || 0).toLocaleString()} SAR</td>
                <td><span class="badge \${badgeClass}">\${p.state || 'new'}</span></td>
              </tr>
            \`;
          }).join('');
        }
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">تعذر تحميل المشاريع</td></tr>';
      }
    }

    async function fetchInventory() {
      const tbody = document.getElementById('invTbody');
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
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">تعذر تحميل المخزون</td></tr>';
      }
    }

    async function fetchUsers() {
      const tbody = document.getElementById('usersTbody');
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
              <td><span class="badge badge-gold">\${u.role}</span></td>
              <td><span class="badge \${u.is_active ? 'badge-done' : 'badge-new'}">\${u.is_active ? 'نشط' : 'معطل'}</span></td>
            </tr>
          \`).join('');
        }
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">تعذر تحميل المستخدمين</td></tr>';
      }
    }

    async function fetchProcurement() {
      const tbody = document.getElementById('procTbody');
      try {
        const res = await fetch('/api/procurement');
        const json = await res.json();
        if (json.success && json.orders) {
          tbody.innerHTML = json.orders.map(o => \`
            <tr>
              <td><strong style="color: var(--cyan);">\${o.po_number}</strong></td>
              <td><strong>\${o.supplier_name || '—'}</strong></td>
              <td>\${o.date_issue ? o.date_issue.substring(0, 10) : '—'}</td>
              <td><strong style="color: var(--gold);">\${Number(o.total_amount || 0).toLocaleString()} SAR</strong></td>
              <td>\${o.project_name || '—'}</td>
              <td><span class="badge badge-done">\${o.status || 'draft'}</span></td>
            </tr>
          \`).join('');
        }
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">تعذر تحميل المشتريات</td></tr>';
      }
    }

    async function fetchTasks() {
      const tbody = document.getElementById('tasksTbody');
      try {
        const res = await fetch('/api/tasks');
        const json = await res.json();
        if (json.success && json.tasks) {
          tbody.innerHTML = json.tasks.map(t => {
            const isDone = t.status === 'completed' || t.status === 'verified';
            const isProg = t.status === 'in_progress';
            const badgeClass = isDone ? 'badge-done' : (isProg ? 'badge-prog' : 'badge-new');
            return \`
              <tr>
                <td><strong>\${t.title}</strong></td>
                <td>\${t.department || '—'}</td>
                <td><span style="color: var(--gold);">\${t.project_name || '—'}</span></td>
                <td>\${t.assigned_employee_name || t.assigned_to || 'فني المصنع'}</td>
                <td><span class="badge \${t.priority === 'urgent' ? 'badge-prog' : 'badge-done'}">\${t.priority || 'medium'}</span></td>
                <td><span class="badge \${badgeClass}">\${t.status || 'assigned'}</span></td>
              </tr>
            \`;
          }).join('');
        }
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">تعذر تحميل المهام</td></tr>';
      }
    }

    async function fetchProduction() {
      const tbody = document.getElementById('prodTbody');
      try {
        const res = await fetch('/api/production/orders');
        const json = await res.json();
        if (json.success && json.orders) {
          tbody.innerHTML = json.orders.map(o => \`
            <tr>
              <td><strong style="color: var(--gold);">\${o.order_number}</strong></td>
              <td><strong>\${o.panel_name || '—'}</strong></td>
              <td>\${o.department || '—'}</td>
              <td><span class="badge badge-prog">\${o.stage || 'cut'}</span></td>
              <td>\${o.quantity || 1}</td>
              <td>\${o.requires_painting ? '✅ نعم' : '❌ لا'}</td>
            </tr>
          \`).join('');
        }
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;text-align:center;">تعذر تحميل أوامر التصنيع</td></tr>';
      }
    }

    async function fetchCrm() {
      const tbody = document.getElementById('crmTbody');
      try {
        const res = await fetch('/api/crm');
        const json = await res.json();
        if (json.success && json.leads) {
          const catMap = {
            electrical_panels: '⚡ لوحات كهربائية',
            cable_tray_enclosure: '📦 كابل تري وخزنه',
            materials_parts: '🔩 مواد وقطع'
          };
          const statusMap = {
            under_manufacturing: '⚙️ قيد التصنيع',
            ready_for_delivery: '🚚 جاهز للتسليم',
            delivered: '✅ تم التسليم'
          };
          tbody.innerHTML = json.leads.map(l => {
            const cat = catMap[l.product_category] || '⚡ لوحات كهربائية';
            const st = statusMap[l.sales_status] || '⚙️ قيد التصنيع';
            const out = l.outcome === 'won' ? '✓ تم التعاقد / ناجح' : (l.outcome === 'in_progress' ? '⏳ جاري العمل' : 'معلق');
            return \`
              <tr>
                <td><strong style="color: var(--gold);">\${l.reference || 'REF-2026'}</strong></td>
                <td><strong>\${l.name || l.title}</strong></td>
                <td>\${l.customer_name || l.company_name || '—'}</td>
                <td><span class="badge badge-subtle">\${cat}</span></td>
                <td><span style="color: #10b981; font-weight: 600;">\${out}</span></td>
                <td><span class="badge \${l.sales_status === 'delivered' ? 'badge-done' : (l.sales_status === 'ready_for_delivery' ? 'badge-new' : 'badge-prog')}">\${st}</span></td>
                <td><strong style="color: var(--emerald);">\${Number(l.expected_revenue || l.estimated_value || 0).toLocaleString()} SAR</strong></td>
              </tr>
            \`;
          }).join('');
        }
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="color:#ef4444;text-align:center;">تعذر تحميل المبيعات</td></tr>';
      }
    }

    // Auto-fetch if starting on subview
    if ('${activeTab}' === 'projects') fetchProjects();
    if ('${activeTab}' === 'procurement') fetchProcurement();
    if ('${activeTab}' === 'tasks') fetchTasks();
    if ('${activeTab}' === 'warehouse') fetchInventory();
    if ('${activeTab}' === 'production') fetchProduction();
    if ('${activeTab}' === 'crm') fetchCrm();
    if ('${activeTab}' === 'hr') fetchUsers();
  </script>
</body>
</html>`;
}

