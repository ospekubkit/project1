import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const body = req.body;

    // Verifikasi signature dari Doku (optional tapi sangat direkomendasikan)
    // Doku mengirim header 'Signature' yang bisa diverifikasi
    // Format: HMACSHA256=base64(HMAC-SHA256(message, secret_key))

    console.log('Doku Webhook received:', JSON.stringify(body, null, 2));

    const invoiceNumber = body.order?.invoice_number;
    const transactionStatus = body.transaction?.status;

    if (!invoiceNumber) {
        console.error('Webhook: invoice_number not found');
        return res.status(400).json({ error: 'invoice_number missing' });
    }

    if (transactionStatus === 'SUCCESS') {
        // Update status order ke LUNAS di Supabase
        const { error: updateError } = await supabase
            .from('orders')
            .update({ status: 'LUNAS (Terverifikasi)' })
            .eq('id', invoiceNumber);

        if (updateError) {
            console.error('Failed to update order status:', updateError);
            return res.status(500).json({ error: updateError.message });
        }

        console.log(`Order ${invoiceNumber} updated to LUNAS`);

        // Trigger kirim invoice email via send-invoice endpoint
        try {
            const appUrl = 'https://project1-eight-kohl.vercel.app';
            await fetch(`${appUrl}/api/send-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: invoiceNumber })
            });
            console.log(`Invoice email triggered for ${invoiceNumber}`);
        } catch (e) {
            // Jangan return error — tetap return 200 ke Doku
            console.error('Failed to send invoice email:', e);
        }
    } else if (transactionStatus === 'EXPIRED') {
        await supabase
            .from('orders')
            .update({ status: 'Pembayaran Expired' })
            .eq('id', invoiceNumber);
        console.log(`Order ${invoiceNumber} expired`);
    } else if (transactionStatus === 'FAILED') {
        await supabase
            .from('orders')
            .update({ status: 'Pembayaran Gagal' })
            .eq('id', invoiceNumber);
        console.log(`Order ${invoiceNumber} failed`);
    }

    // Selalu return 200 ke Doku agar tidak retry
    return res.status(200).json({ success: true });
}
