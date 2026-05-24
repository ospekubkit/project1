import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { orderId, amount, customerName, email, phone, items, affiliateCode } = req.body;

    if (!orderId || !amount || !customerName || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const clientId = process.env.DOKU_CLIENT_ID; // Merchant ID
    const secretKey = process.env.DOKU_SECRET_KEY;
    const baseUrl = 'https://api.doku.com';
    const path = '/checkout/v1/payment';
    const appUrl = 'https://project1-eight-kohl.vercel.app';

    const requestDate = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const requestId = `REQ-${Date.now()}`;

    const requestBody = {
        order: {
            invoice_number: orderId,
            line_items: items.map(item => ({
                name: item.name.substring(0, 50),
                price: item.price,
                quantity: item.quantity
            })),
            amount: amount,
            currency: 'IDR',
            callback_url: `${appUrl}/payment-success.html?order=${orderId}`,
            callback_url_cancel: `${appUrl}/#checkout`
        },
        payment: {
            payment_due_date: 60
        },
        customer: {
            name: customerName,
            email: email,
            phone: phone || '081234567890',
            country_code: 'ID'
        }
    };

    const bodyString = JSON.stringify(requestBody);
    const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
    const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestDate}\nRequest-Target:${path}\nDigest:${digest}`;
    const signature = 'HMACSHA256=' + crypto.createHmac('sha256', secretKey).update(component).digest('base64');

    try {
        // 1. Simpan order ke Supabase dulu sebelum redirect ke Doku
        const { error: dbError } = await supabase.from('orders').insert([{
            id: orderId,
            name: customerName,
            whatsapp: phone,
            email: email,
            items: items,
            total: amount,
            status: 'Menunggu Pembayaran',
            affiliate_code: affiliateCode || null
        }]);

        if (dbError) {
            console.error('Supabase insert error:', dbError);
            return res.status(500).json({ error: 'Gagal menyimpan pesanan: ' + dbError.message });
        }

        // 2. Buat transaksi di Doku
        const response = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Id': clientId,
                'Request-Id': requestId,
                'Request-Timestamp': requestDate,
                'Signature': signature
            },
            body: bodyString
        });

        const result = await response.json();

        if (!response.ok) {
            // Hapus order dari Supabase jika Doku gagal
            await supabase.from('orders').delete().eq('id', orderId);
            console.error('Doku API error:', result);
            return res.status(500).json({ error: result });
        }

        const paymentUrl = result.response?.payment?.url;
        if (!paymentUrl) {
            await supabase.from('orders').delete().eq('id', orderId);
            return res.status(500).json({ error: 'Doku tidak mengembalikan URL pembayaran', raw: result });
        }

        return res.status(200).json({
            success: true,
            payment_url: paymentUrl,
            order_id: orderId
        });

    } catch (err) {
        console.error('create-payment error:', err);
        return res.status(500).json({ error: err.message });
    }
}
