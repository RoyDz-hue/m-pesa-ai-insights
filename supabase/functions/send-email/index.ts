import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// MTrans branded email HTML template
const getVerificationEmailHtml = (
  verificationUrl: string,
  emailType: string
) => {
  const isPasswordReset = emailType === 'recovery'
  const isMagicLink = emailType === 'magiclink'
  
  let title = 'Verify Your MTrans Account'
  let buttonText = '✨ Verify My Account ✨'
  let introText = "We're absolutely <span style=\"color: #10b981; font-weight: 600;\">thrilled</span> to have you join the MTrans family! 🚀"
  let subText = "You're just <span style=\"font-weight: 600; color: #3b82f6;\">one click away</span> from unlocking powerful M-PESA transaction intelligence."
  
  if (isPasswordReset) {
    title = 'Reset Your MTrans Password'
    buttonText = '🔐 Reset Password 🔐'
    introText = "We received a request to reset your password."
    subText = "Click the button below to set a new password for your account."
  } else if (isMagicLink) {
    title = 'Your MTrans Magic Link'
    buttonText = '✨ Sign In Now ✨'
    introText = "Here's your magic link to access MTrans!"
    subText = "Click the button below to sign in instantly - no password needed."
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4); max-width: 100%;">
                    
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 40px 40px 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">MTrans</h1>
                            <p style="margin: 12px 0 0 0; color: #d1fae5; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">M-PESA Transaction Intelligence</p>
                        </td>
                    </tr>
                    
                    <!-- Welcome Section -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                            <h2 style="color: #10b981; font-size: 28px; margin: 0 0 20px 0; font-weight: 700;">Welcome Aboard!</h2>
                            <p style="color: #f1f5f9; font-size: 22px; margin: 0 0 16px 0; font-weight: 600;">Hi there,</p>
                            <p style="color: #94a3b8; font-size: 16px; line-height: 1.8; margin: 0 0 16px 0;">
                                ${introText}
                            </p>
                            <p style="color: #94a3b8; font-size: 15px; line-height: 1.8; margin: 0;">
                                ${subText}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Verification Button Section -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px; text-align: center;">
                            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%); border-radius: 12px; padding: 30px; margin: 0;">
                                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px 0; font-weight: 500;">Click the button below:</p>
                                
                                <a href="${verificationUrl}" style="display: inline-block; text-decoration: none; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: #ffffff; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 700; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3); text-transform: uppercase;">
                                    ${buttonText}
                                </a>
                                
                                <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0 0; line-height: 1.6;">
                                    This link will expire in <span style="font-weight: 600; color: #ef4444;">24 hours</span> for your security
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Alternative Link Section -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px; text-align: center;">
                            <div style="background: #334155; border-radius: 8px; padding: 20px; border-left: 4px solid #3b82f6;">
                                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">
                                    Button not working?
                                </p>
                                <p style="color: #94a3b8; font-size: 13px; margin: 0 0 12px 0;">
                                    Copy and paste this link into your browser:
                                </p>
                                <p style="color: #3b82f6; font-size: 11px; margin: 0; word-break: break-all; font-family: monospace; background: #1e293b; padding: 12px; border-radius: 6px;">
                                    ${verificationUrl}
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Features Section -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <p style="color: #f1f5f9; text-align: center; font-size: 18px; margin: 0 0 24px 0; font-weight: 600;">What awaits you:</p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="33%" style="padding: 12px; text-align: center;">
                                        <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
                                        <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 600;">Real-time Analytics</p>
                                    </td>
                                    <td width="33%" style="padding: 12px; text-align: center;">
                                        <div style="font-size: 32px; margin-bottom: 8px;">🤖</div>
                                        <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 600;">AI-Powered Insights</p>
                                    </td>
                                    <td width="33%" style="padding: 12px; text-align: center;">
                                        <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
                                        <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 600;">Fraud Detection</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px 40px; text-align: center;">
                            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px 0; line-height: 1.6;">
                                Need help? We're here for you!<br>
                                Contact us at <a href="mailto:support@mtrans.app" style="color: #3b82f6; text-decoration: none; font-weight: 600;">support@mtrans.app</a>
                            </p>
                            <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.6;">
                                © 2024 MTrans. All rights reserved.<br>
                                <span style="color: #475569;">If you didn't request this, please ignore this email.</span>
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    console.log('Received email request:', JSON.stringify(payload, null, 2))

    const { email, type, verification_url } = payload

    if (!email || !verification_url) {
      throw new Error('Missing required fields: email and verification_url')
    }

    // Determine email subject based on action type
    let subject = 'Verify Your MTrans Account'
    if (type === 'magiclink') {
      subject = 'Your MTrans Magic Link'
    } else if (type === 'recovery') {
      subject = 'Reset Your MTrans Password'
    } else if (type === 'invite') {
      subject = "You're Invited to MTrans"
    } else if (type === 'email_change') {
      subject = 'Confirm Your New Email - MTrans'
    }

    const html = getVerificationEmailHtml(verification_url, type || 'signup')

    console.log('Sending email via Resend to:', email)

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MTrans <onboarding@resend.dev>',
        to: [email],
        subject,
        html,
      }),
    })

    const data = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend error:', data)
      throw new Error(data.message || 'Failed to send email')
    }

    console.log('Email sent successfully:', data)

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in send-email function:', errorMessage)
    return new Response(
      JSON.stringify({
        error: {
          message: errorMessage,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
