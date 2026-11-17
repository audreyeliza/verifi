import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Look up a record the caller is allowed to read, then sign that record's file.
// Never accept a raw file_uri from the browser.
const KINDS = {
  income: 'IncomeDocument',
  notice: 'Notice',
};

export default async function viewPrivateDocument(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (
      error.status === 401 ? null : Promise.reject(error)
    ));
    if (!user) return Response.json({ error: 'Sign in to view this file.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const entityName = KINDS[body.kind];
    const id = typeof body.id === 'string' ? body.id : '';
    if (!entityName || !id) {
      return Response.json({ error: 'kind and id are required' }, { status: 400 });
    }

    const record = await base44.entities[entityName]
      .get(id)
      .catch((error) => (error.status === 404 ? null : Promise.reject(error)));
    if (!record) return Response.json({ error: 'Not found' }, { status: 404 });
    if (!record.file_uri) {
      return Response.json({ error: 'This record has no file.' }, { status: 404 });
    }

    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: record.file_uri,
      expires_in: 300,
    });
    if (!signed?.signed_url) {
      return Response.json({ error: 'Could not open the file.' }, { status: 500 });
    }
    return Response.json({ signed_url: signed.signed_url });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not open the file.' }, { status: 500 });
  }
}
