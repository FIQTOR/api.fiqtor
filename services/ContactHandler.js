const axios = require("axios");
const nodemailer = require("nodemailer");

/**
 * Service untuk menangani pengiriman pesan dengan UI yang lebih memuaskan
 */
async function messagingService(data) {
    try {
        console.log("🚀 Initiating high-speed delivery via WhatsApp...");
        const waResponse = await sendWhatsApp(data);

        return {
            success: true,
            provider: "whatsapp",
            info: waResponse.data
        };

    } catch (waError) {
        console.error("⚠️ WhatsApp failed. Triggering professional Email fallback...");

        try {
            const emailInfo = await sendEmail(data);
            return {
                success: true,
                provider: "email",
                info: emailInfo
            };
        } catch (emailError) {
            console.error("❌ Critical: All messaging channels are exhausted.");
            throw new Error("Failed to deliver message through all available channels.");
        }
    }
}

// Helper: WhatsApp API (Clean & Structured)
async function sendWhatsApp(data) {
    // Membersihkan input agar tidak ada karakter aneh yang merusak template
    const cleanName = data.name.trim();
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanType = data.type.toUpperCase();

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: process.env.RECIPIENT_WAID,
        type: "template",
        template: {
            name: "talk",
            language: { code: "en" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: `${cleanName}` }, // Bold name
                        { type: "text", text: cleanEmail },
                        { type: "text", text: `${cleanType}` }, // Add icon for context
                        { type: "text", text: data.message },
                    ],
                },
            ],
        },
    };

    return axios({
        method: "post",
        url: `https://graph.facebook.com/${process.env.VERSION}/${process.env.PHONE_NUMBER_ID}/messages`,
        headers: {
            Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
            "Content-Type": "application/json",
        },
        data: payload,
    });
}

// Helper: Nodemailer (Premium Modern HTML Template)
async function sendEmail(data) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: true,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // Template HTML yang lebih 'Tech' dan Clean
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 32px; text-align: center; color: white; }
            .content { padding: 32px; color: #1e293b; line-height: 1.6; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
            .badge-tech { background-color: #dbeafe; color: #1e40af; }
            .field-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-weight: 700; }
            .field-value { font-size: 16px; color: #0f172a; margin-bottom: 24px; }
            .message-box { background-color: #f8fafc; border-radius: 8px; padding: 20px; border-left: 4px solid #2563eb; font-style: italic; color: #334155; }
            .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #f1f5f9; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0; font-size: 20px; letter-spacing: -0.025em;">New Inquiry: ${process.env.FRONTEND_HOST || "website"}</h2>
            </div>
            <div class="content">
                <div class="badge badge-tech">${data.type}</div>
                
                <div class="field-label">Sender Name</div>
                <div class="field-value"><b>${data.name}</b></div>
                
                <div class="field-label">Email Address</div>
                <div class="field-value"><a href="mailto:${data.email}" style="color: #2563eb; text-decoration: none;">${data.email}</a></div>
                
                <div class="field-label">Message</div>
                <div class="message-box">
                    "${data.message}"
                </div>
            </div>
            <div class="footer">
                Sent automatically via <b>Fiqtor Intelligence Systems</b><br>
                Surabaya, Indonesia • ${new Date().getFullYear()}
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"Fiqtor Notifier" <${process.env.EMAIL_USERNAME}>`,
        to: process.env.EMAIL_RECIPIENT || process.env.EMAIL_USERNAME,
        subject: `🚀 [${data.type}] Message from ${data.name}`,
        text: `New message from ${data.name} (${data.email}): ${data.message}`, // Fallback plain text
        html: htmlContent,
    };

    return transporter.sendMail(mailOptions);
}

module.exports = { messagingService };