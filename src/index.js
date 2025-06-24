export default {
	async fetch(req, env) {
		// CORS headers for all responses
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		};

		// Handle CORS preflight
		if (req.method === 'OPTIONS') {
			return new Response('', { headers: corsHeaders });
		}

		// Only handle POST requests
		if (req.method !== 'POST') {
			return new Response('Method not allowed', { 
				status: 405, 
				headers: corsHeaders 
			});
		}

		try {
			let data;
			
			// Parse the incoming data based on content type
			const contentType = req.headers.get('Content-Type') || '';
			
			if (contentType.includes('application/x-www-form-urlencoded')) {
				// Parse URL-encoded data
				const text = await req.text();
				data = Object.fromEntries(new URLSearchParams(text));
			} else if (contentType.includes('multipart/form-data')) {
				// Parse FormData
				data = Object.fromEntries(await req.formData());
			} else {
				// Try to parse as FormData by default
				data = Object.fromEntries(await req.formData());
			}

			console.log('📨 Received form data:', data);

			// Store in KV with timestamp
			const timestamp = Date.now().toString();
			await env.WINES.put(timestamp, JSON.stringify({
				...data,
				timestamp: new Date().toISOString(),
				userAgent: req.headers.get('User-Agent') || 'unknown'
			}));

			// Send email notification with better formatting
			const emailBody = `
				<h2>New Wine Storage Request</h2>
				<p><strong>Name:</strong> ${(data.first_name || '').trim()} ${(data.last_name || '').trim()}</p>
				<p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
				<p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
				<p><strong>Cases:</strong> ${data.cases || 'Not selected'}</p>
				<p><strong>Price Estimate:</strong> ${data.price_estimate || 'Not calculated'}</p>
				<p><strong>Comments:</strong> ${data.comments || 'None provided'}</p>
				<p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
				<hr>
				<details>
					<summary>Raw Data</summary>
					<pre>${JSON.stringify(data, null, 2)}</pre>
				</details>
			`;

			let emailStatus = 'success';
			let emailError = null;

			// Check if RESEND_KEY is available
			if (!env.RESEND_KEY) {
				emailStatus = 'failed';
				emailError = 'RESEND_KEY not configured';
				console.log('📧 Skipping email - RESEND_KEY not available');
			} else {
				try {
					console.log('📧 Attempting to send email via Resend...');
					
					const emailResponse = await fetch('https://api.resend.com/emails', {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${env.RESEND_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							from: 'onboarding@resend.dev',
							to: 'dta35@cornell.edu',
							subject: `Wine Storage Request: ${(data.first_name || '').trim()} ${(data.last_name || '').trim()} (${data.cases || 'unknown'} cases)`,
							html: emailBody
						})
					});

					const emailResponseText = await emailResponse.text();
					console.log('📧 Resend API response status:', emailResponse.status);
					console.log('📧 Resend API response body:', emailResponseText);

					if (!emailResponse.ok) {
						emailStatus = 'failed';
						emailError = `Resend API error ${emailResponse.status}: ${emailResponseText}`;
						console.error('❌ Email sending failed:', emailError);
					} else {
						console.log('✅ Email sent successfully!');
					}
				} catch (emailErr) {
					emailStatus = 'failed';
					emailError = `Email sending exception: ${emailErr.message}`;
					console.error('❌ Email sending exception:', emailErr);
				}
			}

			// Send to Google Sheets via Apps Script webhook - DISABLED
			let sheetsStatus = 'disabled';
			let sheetsError = null;

			// COMMENTED OUT - Google Sheets integration is disabled
			/*
			try {
				console.log('📊 Attempting to send data to Google Sheets...');
				
				const sheetsResponse = await fetch('https://script.google.com/macros/s/AKfycbxjGIwt8YXfz4jmOcLqM8-2nMWMS2WM1IzdE92sSZdsS6G0AiWRe49EcJD4LE0A3OhG/exec', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						...data,
						timestamp: new Date().toISOString(),
						userAgent: req.headers.get('User-Agent') || 'unknown'
					})
				});

				const sheetsResponseText = await sheetsResponse.text();
				console.log('📊 Google Sheets API response status:', sheetsResponse.status);
				console.log('📊 Google Sheets API response body:', sheetsResponseText);

				if (!sheetsResponse.ok) {
					sheetsStatus = 'failed';
					sheetsError = `Google Sheets API error ${sheetsResponse.status}: ${sheetsResponseText}`;
					console.error('❌ Google Sheets integration failed:', sheetsError);
				} else {
					console.log('✅ Data sent to Google Sheets successfully!');
				}
			} catch (sheetsErr) {
				sheetsStatus = 'failed';
				sheetsError = `Google Sheets sending exception: ${sheetsErr.message}`;
				console.error('❌ Google Sheets sending exception:', sheetsErr);
			}
			*/

			// Return success response with CORS headers and both email and sheets status
			return new Response(JSON.stringify({ 
				success: true, 
				message: 'Form submitted successfully',
				timestamp,
				emailStatus,
				emailError: emailError || undefined,
				sheetsStatus,
				sheetsError: sheetsError || undefined
			}), {
				status: 200,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				}
			});

		} catch (error) {
			console.error('🚨 Worker error:', error);
			
			// Return error response with CORS headers
			return new Response(JSON.stringify({ 
				success: false, 
				error: 'Internal server error',
				message: error.message 
			}), {
				status: 500,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				}
			});
		}
	}
};
  