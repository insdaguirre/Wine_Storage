import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('Wine Storage Form Worker', () => {
	it('responds with method not allowed for GET requests (unit style)', async () => {
		const request = new Request('http://example.com', { method: 'GET' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(405);
		expect(await response.text()).toMatchInlineSnapshot(`"Method not allowed"`);
	});

	it('responds with method not allowed for GET requests (integration style)', async () => {
		const response = await SELF.fetch('http://example.com', { method: 'GET' });
		expect(response.status).toBe(405);
		expect(await response.text()).toMatchInlineSnapshot(`"Method not allowed"`);
	});

	it('handles CORS preflight requests', async () => {
		const request = new Request('http://example.com', { method: 'OPTIONS' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
	});

	it('processes form submissions successfully (unit style)', async () => {
		const formData = new URLSearchParams({
			first_name: 'John',
			last_name: 'Doe',
			email: 'john.doe@example.com',
			phone: '555-1234',
			cases: '1-10',
			comments: 'Test submission',
			price_estimate: 'Storing 1-10 cases for 6 months is estimated to cost $178.'
		});

		const request = new Request('http://example.com', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: formData.toString()
		});

		// Create a test environment with mock KV
		const testEnv = {
			...env,
			WINES: {
				put: async (key, value) => {
					console.log(`Mock KV put: ${key} = ${value}`);
					return Promise.resolve();
				}
			},
			// Don't provide RESEND_KEY so email sending will be skipped
			RESEND_KEY: undefined
		};

		const ctx = createExecutionContext();
		const response = await worker.fetch(request, testEnv, ctx);
		await waitOnExecutionContext(ctx);
		
		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result.success).toBe(true);
		expect(result.message).toBe('Form submitted successfully');
		expect(result.emailStatus).toBe('failed'); // Since no RESEND_KEY
		expect(result.sheetsStatus).toBe('disabled'); // Since it's commented out
	});
});
