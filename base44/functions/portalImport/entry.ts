import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const sheetName = body.sheet || 'Men XC';

    const sheetConfig = {
      'Men XC':      { gender: 'M', eventName: "Men's Cross Country" },
      'Men Outdoor': { gender: 'M', eventName: "Men's Track, Outdoor" },
      'Women XC':    { gender: 'F', eventName: "Women's Cross Country" },
      'Women Track': { gender: 'F', eventName: "Women's Track, Outdoor" },
    };

    const cfg = sheetConfig[sheetName];
    if (!cfg) {
      return Response.json({ error: `Unknown sheet: ${sheetName}` }, { status: 400 });
    }

    const fileUrl = 'https://media.base44.com/files/public/6a1893dc4924557a687e6543/df8b6104c_PortalInfo1.xlsx';

    const extracted = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                institution: { type: 'string' },
                division: { type: 'string' },
                sport: { type: 'string' },
                sport_conference: { type: 'string' },
                year: { type: 'string' },
              }
            }
          }
        }
      }
    });

    if (extracted.status !== 'success') {
      return Response.json({ error: 'Extraction failed', details: extracted.details }, { status: 500 });
    }

    const rows = Array.isArray(extracted.output) ? extracted.output : (extracted.output?.rows || []);

    const clean = (val) => val == null ? '' : String(val).replace(/\u00a0/g, '').replace(/\s+/g, ' ').trim();

    const records = rows
      .filter(r => clean(r.first_name) && clean(r.last_name))
      .map(r => ({
        first_name: clean(r.first_name),
        last_name: clean(r.last_name),
        gender: cfg.gender,
        team: clean(r.institution),
        year: clean(r.division),
        event_name: clean(r.sport).split('\n')[0] || cfg.eventName,
        event_code: clean(r.sport_conference).split('\n')[0],
        mark: clean(r.year),
        mark_seconds: 0,
        meet_name: sheetName,
        is_field_event: false,
      }));

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      await base44.asServiceRole.entities.Runner.bulkCreate(records.slice(i, i + batchSize));
    }

    return Response.json({ success: true, sheet: sheetName, imported: records.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});