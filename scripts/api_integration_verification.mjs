/**
 * FraudGuard AI — API & Reverse Proxy Integration Verification
 * Tests the live HTTP API and Vite reverse proxy (port 5173),
 * authentication, real model inference, analytics, RBAC boundaries, and admin routes.
 * 
 * NOTE: This is an automated API & Integration test suite using fetch().
 * It validates HTTP endpoints, data contracts, and RBAC security boundaries.
 * For actual browser UI testing, genuine browser automation (e.g. Playwright or browser agents)
 * is used to test interactive page elements and client-side behavior.
 */

const FRONTEND_ORIGIN = process.env.TEST_ORIGIN || 'http://localhost:5173';

async function runApiIntegrationTests() {
  console.log('====================================================================');
  console.log('FRAUDGUARD AI — API & REVERSE PROXY INTEGRATION VERIFICATION');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Verify frontend index.html
  console.log('1. Verifying Frontend Static Delivery (Vite Dev Server)...');
  try {
    const res = await fetch(`${FRONTEND_ORIGIN}/`);
    assert(res.status === 200, `Root returns 200 OK (Status: ${res.status})`);
    const text = await res.text();
    assert(text.includes('<div id="root"></div>'), 'Contains root application container');
    assert(text.includes('/src/main.tsx'), 'References main Vite TypeScript entrypoint');
  } catch (err) {
    assert(false, `Failed to reach frontend server: ${err.message}`);
  }

  // 2. Test Proxy: Unauthorized access handling
  console.log('\n2. Verifying Reverse Proxy & Security Boundaries...');
  try {
    const res = await fetch(`${FRONTEND_ORIGIN}/api/dashboard/summary`);
    assert(res.status === 401, `Unauthenticated request correctly rejected with 401 (Status: ${res.status})`);
  } catch (err) {
    assert(false, `Proxy connection error: ${err.message}`);
  }

  // 3. Test Analyst Authentication via Frontend Proxy
  console.log('\n3. Testing Analyst Authentication via Vite Proxy...');
  let analystToken = null;
  try {
    const loginRes = await fetch(`${FRONTEND_ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'analyst@fraudguard.ai',
        password: 'Analyst@123456',
      }),
    });
    assert(loginRes.status === 200, `Login returns 200 OK (Status: ${loginRes.status})`);
    const data = await loginRes.json();
    assert(Boolean(data.access_token), 'Access token issued');
    assert(data.token_type === 'bearer', 'Bearer token type returned');
    assert(data.user?.role === 'ANALYST', `User role verified as ANALYST (Role: ${data.user?.role})`);
    analystToken = data.access_token;
  } catch (err) {
    assert(false, `Analyst login failed: ${err.message}`);
  }

  const analystHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${analystToken}`,
  };

  // 4. Test Core Analytical Dashboard Endpoints
  console.log('\n4. Verifying Core Analyst Dashboard Endpoints...');
  try {
    const summaryRes = await fetch(`${FRONTEND_ORIGIN}/api/dashboard/summary`, { headers: analystHeaders });
    assert(summaryRes.status === 200, `Dashboard summary returns 200 (Status: ${summaryRes.status})`);
    const summary = await summaryRes.json();
    assert(typeof summary.total_transactions === 'number', `Total transactions numeric: ${summary.total_transactions}`);
    assert(typeof summary.potential_fraud === 'number', `Potential fraud numeric: ${summary.potential_fraud}`);
    assert(typeof summary.fraud_rate === 'number', `Fraud rate numeric: ${(summary.fraud_rate * 100).toFixed(2)}%`);

    const trendsRes = await fetch(`${FRONTEND_ORIGIN}/api/dashboard/trends?days=7`, { headers: analystHeaders });
    assert(trendsRes.status === 200, `Volume trends return 200 (Status: ${trendsRes.status})`);
    const trendsData = await trendsRes.json();
    assert(Array.isArray(trendsData.trends), `Trends returned as array (Count: ${trendsData.trends?.length})`);

    const geoRes = await fetch(`${FRONTEND_ORIGIN}/api/dashboard/geography`, { headers: analystHeaders });
    assert(geoRes.status === 200, `Geographic risk returns 200 (Status: ${geoRes.status})`);
  } catch (err) {
    assert(false, `Dashboard API verification error: ${err.message}`);
  }

  // 5. Test Transaction Ledger & Detail
  console.log('\n5. Verifying Financial Transaction Ledger...');
  let firstTxnId = null;
  try {
    const txnRes = await fetch(`${FRONTEND_ORIGIN}/api/transactions?page=1&page_size=5`, { headers: analystHeaders });
    assert(txnRes.status === 200, `Transactions list returns 200 (Status: ${txnRes.status})`);
    const txns = await txnRes.json();
    assert(Array.isArray(txns.items), `Items array exists with length ${txns.items.length}`);
    if (txns.items.length > 0) {
      firstTxnId = txns.items[0].id;
      const detailRes = await fetch(`${FRONTEND_ORIGIN}/api/transactions/${firstTxnId}`, { headers: analystHeaders });
      assert(detailRes.status === 200, `Transaction detail #${firstTxnId} returns 200`);
      const detail = await detailRes.json();
      assert(Boolean(detail.id), `Transaction detail contains id: ${detail.id}`);
    }
  } catch (err) {
    assert(false, `Transactions API verification error: ${err.message}`);
  }

  // 6. Test Real ML Inference & Explainability (SHAP Waterfall)
  console.log('\n6. Verifying Real-Time Machine Learning Inference & SHAP Local Explanations...');
  try {
    const predictRes = await fetch(`${FRONTEND_ORIGIN}/api/predict`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({
        amount: 85000.0,
        currency: 'USD',
        transaction_type: 'TRANSFER',
        merchant_category: 'CRYPTO',
        location: 'Lagos, NG',
        channel: 'ONLINE',
        customer_id: 'CUST-TEST-001',
        device_risk_score: 0.94,
        ip_risk_score: 0.88,
        velocity_1h: 6,
        velocity_24h: 18,
        avg_amount_ratio: 4.5,
        distance_from_home: 4200.0,
        is_international: true,
      }),
    });
    assert(predictRes.status === 200, `Prediction returns 200 OK (Status: ${predictRes.status})`);
    const pred = await predictRes.json();
    assert(typeof pred.risk_score === 'number', `Calculated risk score: ${pred.risk_score.toFixed(1)}`);
    assert(typeof pred.fraud_probability === 'number', `Fraud probability: ${(pred.fraud_probability * 100).toFixed(1)}%`);
    assert(typeof pred.anomaly_score === 'number', `Anomaly score: ${pred.anomaly_score.toFixed(4)}`);
    assert(Boolean(pred.decision), `Engine decision verdict: ${pred.decision}`);
    assert(Array.isArray(pred.top_risk_factors) && pred.top_risk_factors.length > 0, `SHAP feature attributions returned (${pred.top_risk_factors.length} factors)`);
    assert(typeof pred.prediction_time_ms === 'number', `Inference executed in ${pred.prediction_time_ms.toFixed(2)}ms`);
  } catch (err) {
    assert(false, `ML inference verification error: ${err.message}`);
  }

  // 7. Test MLOps Governance & Observability
  console.log('\n7. Verifying MLOps Model Registry & System Telemetry...');
  try {
    const modelsRes = await fetch(`${FRONTEND_ORIGIN}/api/models`, { headers: analystHeaders });
    assert(modelsRes.status === 200, `Model list returns 200 (Status: ${modelsRes.status})`);
    const models = await modelsRes.json();
    assert(Array.isArray(models) && models.length > 0, `Registered models count: ${models.length}`);

    const champRes = await fetch(`${FRONTEND_ORIGIN}/api/models/active`, { headers: analystHeaders });
    assert(champRes.status === 200, `Active champion model returns 200 (Status: ${champRes.status})`);
    const champ = await champRes.json();
    assert(Boolean(champ.name), `Active champion model: ${champ.name} (${champ.version})`);

    const monSysRes = await fetch(`${FRONTEND_ORIGIN}/api/monitoring/system`, { headers: analystHeaders });
    assert(monSysRes.status === 200, `Monitoring system telemetry returns 200 (Status: ${monSysRes.status})`);
    const telem = await monSysRes.json();
    assert(typeof telem.uptime_seconds === 'number', `System uptime: ${telem.uptime_seconds}s`);

    const monDriftRes = await fetch(`${FRONTEND_ORIGIN}/api/monitoring/drift`, { headers: analystHeaders });
    assert(monDriftRes.status === 200, `Monitoring PSI drift returns 200 (Status: ${monDriftRes.status})`);
    const drift = await monDriftRes.json();
    assert(Array.isArray(drift.items) && drift.items.length > 0, `Feature drift PSI metrics returned (${drift.items?.length || 0} features)`);
  } catch (err) {
    assert(false, `MLOps API verification error: ${err.message}`);
  }

  // 8. Test Grounded Investigation Assistant (Copilot)
  console.log('\n8. Verifying Grounded Investigation Assistant (Copilot)...');
  try {
    const copilotRes = await fetch(`${FRONTEND_ORIGIN}/api/copilot/query`, {
      method: 'POST',
      headers: analystHeaders,
      body: JSON.stringify({ query: 'What are the top flagged transactions today?' }),
    });
    assert(copilotRes.status === 200, `Copilot query returns 200 (Status: ${copilotRes.status})`);
    const copilot = await copilotRes.json();
    assert(Boolean(copilot.answer), 'Copilot returned structured forensic answer');
    assert(Boolean(copilot.provider), `Copilot provider identified: ${copilot.provider}`);
    assert(Boolean(copilot.mode), `Copilot mode identified: ${copilot.mode}`);
  } catch (err) {
    assert(false, `Copilot verification error: ${err.message}`);
  }

  // 9. Test Administrator Access & RBAC Isolation
  console.log('\n9. Verifying Administrator Role-Based Access Control (RBAC)...');
  try {
    const forbiddenRes = await fetch(`${FRONTEND_ORIGIN}/api/admin/statistics`, { headers: analystHeaders });
    assert(forbiddenRes.status === 403, `Analyst access to admin route forbidden with 403 (Status: ${forbiddenRes.status})`);

    const datasetsAnalystRes = await fetch(`${FRONTEND_ORIGIN}/api/datasets`, { headers: analystHeaders });
    assert(datasetsAnalystRes.status === 403, `Analyst access to datasets route forbidden with 403 (Status: ${datasetsAnalystRes.status})`);

    const adminLoginRes = await fetch(`${FRONTEND_ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fraudguard.ai',
        password: 'Admin@123456',
      }),
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeded');
    const adminData = await adminLoginRes.json();
    assert(adminData.user?.role === 'ADMIN', 'Verified user role as ADMIN');

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminData.access_token}`,
    };

    const adminStatsRes = await fetch(`${FRONTEND_ORIGIN}/api/admin/statistics`, { headers: adminHeaders });
    assert(adminStatsRes.status === 200, `Admin stats accessed successfully (Status: ${adminStatsRes.status})`);
    const adminStats = await adminStatsRes.json();
    assert(typeof adminStats.total_users === 'number', `Admin stats total_users: ${adminStats.total_users}`);

    const adminAuditRes = await fetch(`${FRONTEND_ORIGIN}/api/admin/audit-logs?page=1&page_size=5`, { headers: adminHeaders });
    assert(adminAuditRes.status === 200, `Admin audit logs accessed (Status: ${adminAuditRes.status})`);

    const adminDatasetsRes = await fetch(`${FRONTEND_ORIGIN}/api/datasets`, { headers: adminHeaders });
    assert(adminDatasetsRes.status === 200, `Admin access to datasets catalog returns 200 (Status: ${adminDatasetsRes.status})`);
    const datasets = await adminDatasetsRes.json();
    assert(Array.isArray(datasets) && datasets.length > 0, `Cataloged datasets available to Admin: ${datasets.length}`);
  } catch (err) {
    assert(false, `Admin RBAC verification error: ${err.message}`);
  }

  // 10. Test Standard USER Role Boundary Enforcement
  console.log('\n10. Verifying Standard USER Role Permissions & RBAC Sandboxing...');
  try {
    const regEmail = `user.test.${Date.now()}@example.com`;
    const regRes = await fetch(`${FRONTEND_ORIGIN}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regEmail,
        password: 'Password@123',
        name: 'Test Viewer',
      }),
    });
    assert(regRes.status === 201, `Public registration succeeds with 201 (Status: ${regRes.status})`);
    const regUser = await regRes.json();
    assert(regUser.role === 'USER', `Registered user assigned standard USER role: ${regUser.role}`);

    const userLoginRes = await fetch(`${FRONTEND_ORIGIN}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regEmail,
        password: 'Password@123',
      }),
    });
    const userAuth = await userLoginRes.json();
    const userHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userAuth.access_token}`,
    };

    const userAlertsRes = await fetch(`${FRONTEND_ORIGIN}/api/alerts`, { headers: userHeaders });
    assert(userAlertsRes.status === 403, `USER access to alerts forbidden with 403 (Status: ${userAlertsRes.status})`);

    const userModelsRes = await fetch(`${FRONTEND_ORIGIN}/api/models`, { headers: userHeaders });
    assert(userModelsRes.status === 403, `USER access to models forbidden with 403 (Status: ${userModelsRes.status})`);

    const userMonRes = await fetch(`${FRONTEND_ORIGIN}/api/monitoring/system`, { headers: userHeaders });
    assert(userMonRes.status === 403, `USER access to monitoring forbidden with 403 (Status: ${userMonRes.status})`);

    const userTxnRes = await fetch(`${FRONTEND_ORIGIN}/api/transactions?page=1&page_size=2`, { headers: userHeaders });
    assert(userTxnRes.status === 200, `USER access to transactions ledger allowed (Status: ${userTxnRes.status})`);
  } catch (err) {
    assert(false, `Standard USER RBAC verification error: ${err.message}`);
  }

  // 11. Test Ground-Truth Telemetry Contract
  console.log('\n11. Verifying Authentic Telemetry Contract (Zero Placeholders)...');
  try {
    const sysTelemRes = await fetch(`${FRONTEND_ORIGIN}/api/monitoring/system`, { headers: analystHeaders });
    const sysTelem = await sysTelemRes.json();
    assert(Boolean(sysTelem.recent_prediction_distribution), 'Telemetry includes recent_prediction_distribution object');
    assert(typeof sysTelem.recent_prediction_distribution?.APPROVE === 'number', `APPROVE count: ${sysTelem.recent_prediction_distribution?.APPROVE}`);
    assert(typeof sysTelem.recent_prediction_distribution?.REVIEW === 'number', `REVIEW count: ${sysTelem.recent_prediction_distribution?.REVIEW}`);
    assert(typeof sysTelem.recent_prediction_distribution?.BLOCK === 'number', `BLOCK count: ${sysTelem.recent_prediction_distribution?.BLOCK}`);
    assert(typeof sysTelem.avg_inference_latency_ms === 'number', `Average latency: ${sysTelem.avg_inference_latency_ms}ms`);
  } catch (err) {
    assert(false, `Telemetry contract verification error: ${err.message}`);
  }

  // 12. Test Asynchronous Jobs API
  console.log('\n12. Verifying Asynchronous Background Jobs API...');
  try {
    const jobsRes = await fetch(`${FRONTEND_ORIGIN}/api/jobs`, { headers: analystHeaders });
    assert(jobsRes.status === 200, `Jobs list returns 200 (Status: ${jobsRes.status})`);
    const jobs = await jobsRes.json();
    assert(Array.isArray(jobs.items), `Jobs returned as JobListResponse (Total: ${jobs.total}, Count: ${jobs.items?.length})`);
  } catch (err) {
    assert(false, `Jobs API verification error: ${err.message}`);
  }

  console.log('\n====================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApiIntegrationTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
