import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { sheet, gender, defaultEvent } = await req.json();

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
                conference: { type: 'string' },
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

    const rows = extracted.output?.rows || (Array.isArray(extracted.output) ? extracted.output : []);

    const records = rows
      .filter(r => r.first_name && r.last_name)
      .map(r => ({
        first_name: String(r.first_name || '').replace(/\u00a0/g, '').trim(),
        last_name: String(r.last_name || '').replace(/\u00a0/g, '').trim(),
        gender: gender,
        team: String(r.institution || '').trim(),
        year: String(r.division || '').trim(),
        event_name: String(r.sport || defaultEvent).split('\n')[0].trim(),
        event_code: String(r.conference || '').split('\n')[0].trim(),
        mark: String(r.year || '').trim(),
        mark_seconds: 0,
        meet_name: sheet,
        is_field_event: false,
      }));

    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      await base44.asServiceRole.entities.Runner.bulkCreate(records.slice(i, i + batchSize));
    }

    return Response.json({ success: true, imported: records.length, sheet });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});