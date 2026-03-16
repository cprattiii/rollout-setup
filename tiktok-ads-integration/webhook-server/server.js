/**
 * TikTok Lead Webhook Server
 * Captures lead submissions from landing page
 * NOW WITH: TikTok Events API (server-side tracking)
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const TikTokEventsAPI = require('./tiktok-events-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize TikTok Events API
const tiktokAPI = new TikTokEventsAPI(
    process.env.TIKTOK_ACCESS_TOKEN,
    process.env.TIKTOK_PIXEL_ID
);

// Middleware
app.use(cors());
app.use(express.json());

// Data storage file
const LEADS_FILE = path.join(__dirname, 'database/leads.json');

// Ensure database directory and file exist
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify({ leads: [] }, null, 2));
}

// Helper: Read leads from file
function getLeads() {
    try {
        const data = fs.readFileSync(LEADS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading leads:', error);
        return { leads: [] };
    }
}

// Helper: Save leads to file
function saveLeads(leadsData) {
    try {
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leadsData, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving leads:', error);
        return false;
    }
}

// ============================================================================
// WEBHOOK ENDPOINT - Receive leads from landing page
// ============================================================================
app.post('/webhook/lead', async (req, res) => {
    console.log('\n📥 New lead received:');
    console.log(JSON.stringify(req.body, null, 2));

    const leadData = {
        id: `LEAD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...req.body,
        receivedAt: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent')
    };

    // Track results
    const trackingResults = {
        database: false,
        tiktokEventsAPI: false,
        errors: []
    };

    // Save to database
    const data = getLeads();
    data.leads.push(leadData);

    if (saveLeads(data)) {
        console.log(`✅ Lead saved to database (Total: ${data.leads.length})`);
        trackingResults.database = true;
    } else {
        console.error('❌ Failed to save lead to database');
        trackingResults.errors.push('Database save failed');
    }

    // Send to TikTok Events API (server-side tracking)
    // Only send for non-test-generated leads to avoid spamming
    if (!leadData.testGenerated && leadData.email) {
        try {
            const tiktokResult = await tiktokAPI.trackCompleteRegistration(leadData);
            console.log('✅ Event sent to TikTok Events API');
            console.log('   Response:', tiktokResult.message);
            trackingResults.tiktokEventsAPI = true;
        } catch (error) {
            console.error('❌ Failed to send event to TikTok Events API');
            console.error('   Error:', error.error || error.message);
            trackingResults.errors.push(`TikTok Events API: ${error.error || error.message}`);
            trackingResults.tiktokEventsAPI = false;
        }
    } else if (leadData.testGenerated) {
        console.log('⏭️  Skipping TikTok Events API (test-generated lead)');
    }

    // Send response
    if (trackingResults.database) {
        res.status(200).json({
            success: true,
            message: 'Lead captured successfully',
            leadId: leadData.id,
            totalLeads: data.leads.length,
            tracking: trackingResults
        });
    } else {
        res.status(500).json({
            success: false,
            message: 'Failed to save lead',
            tracking: trackingResults
        });
    }
});

// ============================================================================
// API ENDPOINTS - View captured leads
// ============================================================================

// Get all leads
app.get('/api/leads', (req, res) => {
    const data = getLeads();
    res.json({
        success: true,
        count: data.leads.length,
        leads: data.leads
    });
});

// Get lead by ID
app.get('/api/leads/:id', (req, res) => {
    const data = getLeads();
    const lead = data.leads.find(l => l.id === req.params.id);

    if (lead) {
        res.json({
            success: true,
            lead
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Lead not found'
        });
    }
});

// Get lead statistics
app.get('/api/stats', (req, res) => {
    const data = getLeads();

    // Calculate stats
    const stats = {
        totalLeads: data.leads.length,
        sources: {},
        today: 0,
        last24Hours: 0
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    data.leads.forEach(lead => {
        // Count by source
        const source = lead.source || 'Unknown';
        stats.sources[source] = (stats.sources[source] || 0) + 1;

        // Count today
        const leadDate = new Date(lead.timestamp || lead.receivedAt);
        if (leadDate >= today) {
            stats.today++;
        }
        if (leadDate >= last24h) {
            stats.last24Hours++;
        }
    });

    res.json({
        success: true,
        stats
    });
});

// Delete all leads (for testing)
app.delete('/api/leads', (req, res) => {
    saveLeads({ leads: [] });
    console.log('🗑️  All leads deleted');

    res.json({
        success: true,
        message: 'All leads deleted'
    });
});

// ============================================================================
// DASHBOARD - Simple HTML view
// ============================================================================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>TikTok Leads - Webhook Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #000;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #00f2ea 0%, #ff0050 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
        }
        .stat-value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 14px;
            opacity: 0.9;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            background: #f5f5f5;
            font-weight: 600;
        }
        .actions {
            margin-bottom: 20px;
        }
        button {
            background: #00f2ea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
        }
        button:hover {
            opacity: 0.9;
        }
        .delete-btn {
            background: #ff0050;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 TikTok Leads Dashboard</h1>
        <p class="subtitle">Webhook Server - Capturing leads from landing page</p>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value" id="totalLeads">0</div>
                <div class="stat-label">Total Leads</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="todayLeads">0</div>
                <div class="stat-label">Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="last24hLeads">0</div>
                <div class="stat-label">Last 24 Hours</div>
            </div>
        </div>

        <div class="actions">
            <button onclick="loadLeads()">🔄 Refresh</button>
            <button onclick="deleteAll()" class="delete-btn">🗑️ Delete All</button>
        </div>

        <div id="leadsTable"></div>
    </div>

    <script>
        async function loadLeads() {
            try {
                const [leadsRes, statsRes] = await Promise.all([
                    fetch('/api/leads'),
                    fetch('/api/stats')
                ]);

                const leadsData = await leadsRes.json();
                const statsData = await statsRes.json();

                // Update stats
                document.getElementById('totalLeads').textContent = statsData.stats.totalLeads;
                document.getElementById('todayLeads').textContent = statsData.stats.today;
                document.getElementById('last24hLeads').textContent = statsData.stats.last24Hours;

                // Update table
                const leads = leadsData.leads;
                const tableHtml = leads.length > 0 ? \`
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${leads.map(lead => \`
                                <tr>
                                    <td>\${new Date(lead.timestamp || lead.receivedAt).toLocaleString()}</td>
                                    <td>\${lead.name || '-'}</td>
                                    <td>\${lead.email || '-'}</td>
                                    <td>\${lead.phone || '-'}</td>
                                    <td>\${lead.source || 'Unknown'}</td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                \` : '<p>No leads captured yet. Submit a test lead from the landing page!</p>';

                document.getElementById('leadsTable').innerHTML = tableHtml;
            } catch (error) {
                console.error('Error loading leads:', error);
            }
        }

        async function deleteAll() {
            if (confirm('Delete all leads? This cannot be undone.')) {
                await fetch('/api/leads', { method: 'DELETE' });
                loadLeads();
            }
        }

        // Load on page load
        loadLeads();

        // Auto-refresh every 10 seconds
        setInterval(loadLeads, 10000);
    </script>
</body>
</html>
    `);
});

// ============================================================================
// TEST EVENTS API ENDPOINT
// ============================================================================
app.get('/api/test-events-api', async (req, res) => {
    try {
        console.log('\n🧪 Testing TikTok Events API connection...');
        const result = await tiktokAPI.testConnection();
        console.log('✅ Events API test successful');
        res.json({
            success: true,
            message: 'Events API connection successful',
            result
        });
    } catch (error) {
        console.error('❌ Events API test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Events API test failed',
            error: error.error || error.message
        });
    }
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, async () => {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('   🚀 TikTok Lead Webhook Server + Events API');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log(`📍 Dashboard:        http://localhost:${PORT}`);
    console.log(`📍 Webhook endpoint: http://localhost:${PORT}/webhook/lead`);
    console.log(`📍 API endpoints:    http://localhost:${PORT}/api/leads`);
    console.log(`📍 Stats:            http://localhost:${PORT}/api/stats`);
    console.log(`📍 Test Events API:  http://localhost:${PORT}/api/test-events-api`);
    console.log('\n🔧 TikTok Events API Configuration:');
    console.log(`   Pixel ID: ${process.env.TIKTOK_PIXEL_ID}`);
    console.log(`   Access Token: ${process.env.TIKTOK_ACCESS_TOKEN ? '✓ Configured' : '✗ Missing'}`);
    console.log('\n✅ Server ready - Dual tracking enabled (Pixel + Events API)\n');
    console.log('════════════════════════════════════════════════════════════════\n');

    // Test Events API on startup
    try {
        console.log('🧪 Testing Events API connection...');
        await tiktokAPI.testConnection();
        console.log('✅ Events API connection successful!\n');
    } catch (error) {
        console.error('❌ Events API connection failed:', error.error || error.message);
        console.error('   Server will continue but Events API tracking may not work.\n');
    }
});
