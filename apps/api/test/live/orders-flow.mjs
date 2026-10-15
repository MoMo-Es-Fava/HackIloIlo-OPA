// Live end-to-end check of the orders API against a real, freshly seeded database.
// Usage (see README "Live database test"):
//   node apps/api/test/live/orders-flow.mjs http://localhost:4000 <demo PIN>
const [base, pin] = process.argv.slice(2);
let failures = 0;
const results = [];

async function call(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}
function check(name, cond, detail = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!cond) failures++;
}
const login = async (phone) => (await call('POST', '/auth/login', null, { phone, pin })).body?.token;
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const admin = await login('09170000001');
const staff = await login('09170000002');
const farmer = await login('09170000003');
const buyer = await login('09170000006');
check('seeded admin, staff, farmer, buyer can log in', admin && staff && farmer && buyer);

const contact = { contactName: 'Test Person', contactPhone: '0917 123 4567', preferredDate: today };

// ── Buy rice ──
let r = await call('POST', '/orders', buyer, { type: 'BUY_RICE', riceTypeId: 1, requestedKg: '100', ...contact });
const buy = r.body;
check('buyer creates rice order', r.status === 201 && buy.status === 'PENDING', `estimate ₱${buy?.estimatedAmount}, phone ${buy?.contactPhone}`);
check('estimate uses ₱50.70/kg and phone is normalized', buy?.estimatedAmount === '5070.00' && buy?.contactPhone === '+639171234567');
r = await call('POST', '/orders', buyer, { type: 'BUY_RICE', riceTypeId: 1, requestedKg: '999999', ...contact });
check('ordering more rice than in stock is refused', r.status === 400, r.body?.message);
r = await call('PATCH', `/admin/orders/${buy.id}/accept`, staff, {});
check('plant staff accepts rice order', r.status === 200 && r.body.status === 'ACCEPTED', `locked ₱${r.body?.unitPrice}/kg, final ₱${r.body?.finalAmount}`);
for (const s of ['PREPARING', 'READY_FOR_PICKUP', 'PAID', 'COMPLETED']) {
  r = await call('PATCH', `/admin/orders/${buy.id}/status`, staff, { status: s });
  check(`rice order → ${s}`, r.status === 200 && r.body.status === s);
}
r = await call('GET', `/orders/${buy.id}`, buyer);
check('buyer sees full history', r.status === 200 && r.body.events.length === 6, `${r.body?.events?.length} events`);

// Stock is reserved on accept: 1200 - 100 = 1100 left. Two orders of 600 kg: second accept must fail.
const a = (await call('POST', '/orders', buyer, { type: 'BUY_RICE', riceTypeId: 1, requestedKg: '600', ...contact })).body;
const b = (await call('POST', '/orders', buyer, { type: 'BUY_RICE', riceTypeId: 1, requestedKg: '600', ...contact })).body;
r = await call('PATCH', `/admin/orders/${a.id}/accept`, admin, {});
check('first 600 kg order accepted', r.status === 200);
r = await call('PATCH', `/admin/orders/${b.id}/accept`, admin, {});
check('second 600 kg order refused: stock already reserved', r.status === 409, r.body?.message);
r = await call('PATCH', `/admin/orders/${a.id}/status`, admin, { status: 'CANCELLED' });
check('cancelling an accepted rice order', r.status === 200 && r.body.status === 'CANCELLED');
r = await call('PATCH', `/admin/orders/${b.id}/accept`, admin, {});
check('…returns the stock, so the second order can now be accepted', r.status === 200, r.body?.message);

// ── Sell palay ──
const sell = (await call('POST', '/orders', farmer, { type: 'SELL_PALAY', palayCondition: 'FRESH', variety: 'NSIC Rc 222', deliveryMethod: 'SELF_DELIVER', requestedKg: '500', ...contact })).body;
check('farmer offers 500 kg fresh palay', sell?.status === 'PENDING' && sell.estimatedAmount === '8500.00', `estimate ₱${sell?.estimatedAmount}`);
r = await call('PATCH', `/admin/orders/${sell.id}/accept`, admin, {});
check('admin accepts, price locked at ₱17', r.body?.unitPrice === '17.00' && r.body?.scheduledDate !== null);
r = await call('PATCH', `/admin/orders/${sell.id}/status`, admin, { status: 'RECEIVED' });
r = await call('POST', `/admin/orders/${sell.id}/weigh-in`, admin, { wetKg: '520' });
check('weigh-in 520 kg → WEIGHED, final from actual weight', r.body?.status === 'WEIGHED' && r.body?.finalAmount === '8840.00', `final ₱${r.body?.finalAmount}`);
r = await call('PATCH', `/admin/orders/${sell.id}/status`, admin, { status: 'PAID' });
check('cannot pay before the farmer confirms the weight', r.status === 409, r.body?.message);
r = await call('POST', `/orders/${sell.id}/confirm-weight`, buyer);
check("another user can't confirm someone else's weight (looks like not found)", r.status === 404);
r = await call('POST', `/orders/${sell.id}/confirm-weight`, farmer);
check('farmer confirms the weight', r.status === 200 && r.body.weightConfirmedAt !== null);
for (const s of ['PAID', 'COMPLETED']) {
  r = await call('PATCH', `/admin/orders/${sell.id}/status`, admin, { status: s });
  check(`palay sale → ${s}`, r.status === 200 && r.body.status === s);
}

// ── Drying + milling service ──
r = await call('POST', '/orders', farmer, { type: 'SERVICE', serviceType: 'MILLING', palayCondition: 'FRESH', requestedKg: '1000', ...contact });
check('milling fresh palay is refused', r.status === 400, r.body?.message);
const svc = (await call('POST', '/orders', farmer, { type: 'SERVICE', serviceType: 'DRYING_AND_MILLING', palayCondition: 'FRESH', requestedKg: '1000', ...contact })).body;
check('farmer books drying + milling for 1,000 kg', svc?.estimatedAmount === '3184.00', `estimate ₱${svc?.estimatedAmount}`);
r = await call('PATCH', `/admin/orders/${svc.id}/accept`, admin, {});
check('accepting a service needs a date', r.status === 400, r.body?.message);
r = await call('PATCH', `/admin/orders/${svc.id}/accept`, admin, { scheduledDate: today });
check('service accepted → SCHEDULED, fees locked', r.body?.status === 'SCHEDULED' && r.body?.dryingRate === '1.60' && r.body?.millingRate === '3.30');
await call('PATCH', `/admin/orders/${svc.id}/status`, admin, { status: 'RECEIVED' });
await call('POST', `/admin/orders/${svc.id}/weigh-in`, admin, { wetKg: '1000' });
await call('POST', `/orders/${svc.id}/confirm-weight`, farmer);
r = await call('PATCH', `/admin/orders/${svc.id}/status`, admin, { status: 'DRYING' });
check('→ DRYING after farmer confirms', r.body?.status === 'DRYING');
r = await call('PATCH', `/admin/orders/${svc.id}/status`, admin, { status: 'MILLING' });
check('cannot mill before the dried weight is recorded', r.status === 409, r.body?.message);
r = await call('POST', `/admin/orders/${svc.id}/weigh-in`, admin, { dryKg: '400' });
check('suspicious dried weight is flagged for staff', /40%/.test(r.body?.events?.at(-1)?.note ?? ''), r.body?.events?.at(-1)?.note);
await call('POST', `/admin/orders/${svc.id}/weigh-in`, admin, { dryKg: '800' });
r = await call('PATCH', `/admin/orders/${svc.id}/status`, admin, { status: 'MILLING' });
check('cannot mill until the farmer confirms the dried weight', r.status === 409);
await call('POST', `/orders/${svc.id}/confirm-weight`, farmer);
r = await call('PATCH', `/admin/orders/${svc.id}/status`, admin, { status: 'MILLING' });
check('→ MILLING', r.body?.status === 'MILLING');
r = await call('PATCH', `/admin/orders/${svc.id}/status`, admin, { status: 'READY_FOR_PICKUP' });
check('cannot release before rice is weighed', r.status === 409);
r = await call('POST', `/admin/orders/${svc.id}/weigh-in`, admin, { riceKg: '480' });
check('rice weighed → final ₱3,184.00', r.body?.finalAmount === '3184.00', `final ₱${r.body?.finalAmount}`);
for (const s of ['READY_FOR_PICKUP', 'PAID', 'COMPLETED']) {
  r = await call('PATCH', `/admin/orders/${svc.id}/status`, admin, { status: s });
  check(`service → ${s}`, r.status === 200 && r.body.status === s);
}

// ── Reject, cancel, skipping steps, permissions ──
const rej = (await call('POST', '/orders', farmer, { type: 'SELL_PALAY', palayCondition: 'DRY', deliveryMethod: 'IRPC_PICKUP', requestedKg: '200', ...contact })).body;
r = await call('PATCH', `/admin/orders/${rej.id}/reject`, admin, {});
check('reject needs a reason', r.status === 400);
r = await call('PATCH', `/admin/orders/${rej.id}/reject`, admin, { reason: 'Dryers full this week' });
check('rejected with reason', r.body?.status === 'REJECTED' && r.body?.rejectReason === 'Dryers full this week');
const can = (await call('POST', '/orders', farmer, { type: 'SELL_PALAY', palayCondition: 'DRY', deliveryMethod: 'IRPC_PICKUP', requestedKg: '200', ...contact })).body;
r = await call('POST', `/orders/${can.id}/cancel`, farmer);
check('farmer cancels a pending order', r.body?.status === 'CANCELLED');
const skip = (await call('POST', '/orders', farmer, { type: 'SELL_PALAY', palayCondition: 'DRY', deliveryMethod: 'IRPC_PICKUP', requestedKg: '200', ...contact })).body;
r = await call('PATCH', `/admin/orders/${skip.id}/status`, admin, { status: 'PAID' });
check('cannot skip accept (use accept/reject)', r.status === 400);
await call('PATCH', `/admin/orders/${skip.id}/accept`, admin, {});
r = await call('PATCH', `/admin/orders/${skip.id}/status`, admin, { status: 'COMPLETED' });
check('cannot skip steps (ACCEPTED → COMPLETED)', r.status === 400, r.body?.message);
r = await call('GET', '/admin/orders', buyer);
check('buyers cannot open the admin inbox', r.status === 403);
r = await call('POST', '/orders', admin, { type: 'BUY_RICE', riceTypeId: 1, requestedKg: '1', ...contact });
check('staff accounts do not place customer orders', r.status === 403);
r = await call('GET', `/orders/${buy.id}`, farmer);
check("farmer cannot see the buyer's order", r.status === 404);
r = await call('GET', '/orders/mine?active=true', farmer);
check('my active orders lists only open ones', r.status === 200 && r.body.every((o) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(o.status)), `${r.body?.length} active`);
r = await call('GET', '/admin/orders?status=PENDING', admin);
check('admin inbox filters by status', r.status === 200 && r.body.every((o) => o.status === 'PENDING'));
r = await call('GET', `/admin/orders/${svc.id}`, admin);
check('admin order detail includes customer (no PIN) and history', r.body?.customer?.name && !('pinHash' in (r.body?.customer ?? {})) && r.body.events.length > 10, `${r.body?.events?.length} events, customer ${r.body?.customer?.name}`);

// ── Staff enter an offer for a walk-in / phone farmer ──
const walkIn = { type: 'SELL_PALAY', palayCondition: 'FRESH', deliveryMethod: 'SELF_DELIVER', requestedKg: '1000', preferredDate: today, contactName: 'Pedro Walk-in', contactPhone: '0918 111 2222', municipality: 'Pototan' };
r = await call('POST', '/admin/orders', staff, walkIn);
check("staff entry needs the customer's consent", r.status === 400, r.body?.message);
r = await call('POST', '/admin/orders', staff, { ...walkIn, consent: true });
const wi = r.body;
check('staff enter an offer for a new walk-in farmer', r.status === 201 && wi.status === 'PENDING' && wi.contactPhone === '+639181112222');
check('…and the history shows staff entered it', /Entered by IRPC staff/.test(wi?.events?.[0]?.note ?? ''));
r = await call('POST', '/admin/orders', staff, { ...walkIn, contactPhone: '09170000002', consent: true });
check("a staff member's number can't be used as a customer", r.status === 409, r.body?.message);
r = await call('POST', '/admin/orders', farmer, { ...walkIn, consent: true });
check('farmers cannot use the staff entry form', r.status === 403);
r = await call('POST', '/auth/login', null, { phone: '09181112222', pin });
check('a staff-created customer cannot log in until they set a PIN', r.status === 401);
await call('PATCH', `/admin/orders/${wi.id}/accept`, staff, {});
await call('PATCH', `/admin/orders/${wi.id}/status`, staff, { status: 'RECEIVED' });
r = await call('POST', `/admin/orders/${wi.id}/weigh-in`, staff, { wetKg: '980' });
check('walk-in palay weighed: 980 kg × ₱17 = ₱16,660', r.body?.finalAmount === '16660.00', `final ₱${r.body?.finalAmount}`);
r = await call('POST', `/admin/orders/${wi.id}/confirm-weight`, staff);
check('staff record that the farmer confirmed at the scale', r.status === 200 && Boolean(r.body.weightConfirmedAt) && /at the scale/.test(r.body.events.at(-1).note));
r = await call('POST', `/admin/orders/${wi.id}/confirm-weight`, staff);
check("can't confirm the same weight twice", r.status === 409);
for (const s of ['PAID', 'COMPLETED']) {
  r = await call('PATCH', `/admin/orders/${wi.id}/status`, staff, { status: s });
  check(`walk-in sale → ${s}`, r.status === 200 && r.body.status === s);
}

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} passed`);
process.exit(failures ? 1 : 0);
