export default {
	async fetch(req, env) {
	  if (req.method === 'OPTIONS')
		return new Response('', { headers: { 'Access-Control-Allow-Origin': '*' } });
  
	  const data = Object.fromEntries(await req.formData());
	  await env.WINES.put(Date.now().toString(), JSON.stringify(data));
  
	  await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
		  Authorization: `Bearer ${env.RESEND_KEY}`,
		  'Content-Type': 'application/json'
		},
		body: JSON.stringify({
		  from: 'no-reply@intlwinevault.com',
		  to:   'dta1212@gmail.com',
		  subject: 'New Wine Storage Request',
		  html: `<pre>${JSON.stringify(data,null,2)}</pre>`
		})
	  });
  
	  return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
	}
  };
  