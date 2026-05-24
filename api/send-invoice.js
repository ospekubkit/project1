import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Pakai secret key agar punya hak admin
);

export default async function handler(req, res) {
  // Hanya menerima metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    // 1. Ambil data order dari Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error('Order not found or database error');
    }

    if (!order.email) {
      throw new Error('Customer email is not provided for this order');
    }

    // 2. Format daftar item
    let itemsHtml = '<ul style="padding-left: 20px;">';
    if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
            itemsHtml += `<li><strong>${item.name}</strong> x${item.quantity} (Size: ${item.size}) - Rp ${item.price.toLocaleString('id-ID')}</li>`;
        });
    }
    itemsHtml += '</ul>';

    // 3. Konfigurasi Nodemailer Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `"OspekUB.kit" <${process.env.GMAIL_USER}>`,
      to: order.email,
      subject: `INVOICE LUNAS - Pesanan Pre-Order #${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2ecc71; border-bottom: 2px solid #eee; padding-bottom: 10px;">Pembayaran Lunas & Terverifikasi</h2>
          <p>Halo <strong>${order.name}</strong>,</p>
          <p>Terima kasih! Pembayaran untuk pesanan pre-order perlengkapan OSPEK UB 2026 Anda telah kami terima dan verifikasi.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #042125;">Detail Pesanan #${order.id}</h3>
            <p><strong>NIM:</strong> ${order.nim || '-'}</p>
            <p><strong>Fakultas:</strong> ${order.faculty || '-'} - ${order.department || '-'}</p>
            
            <h4>Barang yang dipesan:</h4>
            ${itemsHtml}
            
            <h3 style="color: #2ecc71; margin-bottom: 0;">TOTAL: Rp ${order.total.toLocaleString('id-ID')}</h3>
          </div>
          
          <p style="font-size: 0.9em; color: #666;">
            Simpan email ini sebagai tanda bukti sah pembelian Anda. Pengambilan barang akan diinformasikan lebih lanjut menjelang masa OSPEK.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #999; text-align: center;">
            &copy; 2026 OspekUB.kit Support Team
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Invoice sent successfully', messageId: info.messageId });

  } catch (err) {
    console.error('Error sending invoice:', err);
    return res.status(500).json({ error: err.message });
  }
}
