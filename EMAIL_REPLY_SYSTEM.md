# Email Reply System Documentation

## Overview

The RFI System includes a comprehensive email reply feature that allows clients to respond to RFI notifications directly via email. When clients reply to RFI emails, their responses (including attachments) are automatically captured and stored in the system.

## How It Works

### Email Flow
1. **RFI Created** → System generates RFI with unique reply-to email
2. **Email Sent** → RFI notification sent to client with special reply-to address
3. **Client Replies** → Response goes to `rfi-{rfiId}-{token}@rfi.steel-detailer.com`
4. **Webhook Triggered** → Brevo forwards email to our webhook endpoint
5. **Response Processed** → System creates RFI response and saves attachments
6. **UI Updated** → Response appears in RFI detail page automatically

### Email Address Format
```
rfi-{rfiId}-{securityToken}@rfi.steel-detailer.com
```
- **rfiId**: Database ID of the RFI
- **securityToken**: HMAC-SHA256 token for security validation
- **Domain**: Configurable subdomain for email routing

## Technical Architecture

### Components
- **Brevo Email Service**: Handles email sending and inbound parsing
- **Webhook Endpoint**: `/api/rfis/email-reply` processes incoming emails
- **Token Security**: HMAC validation prevents unauthorized responses
- **Attachment Processing**: Downloads and stores email attachments
- **Database Integration**: Creates Response and Attachment records

### Key Files
- `src/app/api/rfis/email-reply/route.ts` - Main webhook handler
- `src/lib/brevo.ts` - Brevo integration and token management
- `src/app/api/test/email-reply/route.ts` - Development testing endpoint

## Configuration

### Environment Variables
```bash
# Brevo Email Configuration
BREVO_API_KEY="xkeysib-your-api-key-here"
BREVO_REPLY_DOMAIN="rfi.steel-detailer.com"
BREVO_WEBHOOK_SECRET="your-webhook-secret-change-in-production"

# App Configuration  
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### DNS Configuration
Required DNS records for `rfi.steel-detailer.com`:

```dns
# MX Record (Required for inbound email)
rfi.steel-detailer.com.    MX    10    mail.brevo.com.

# DKIM Records (Required for email authentication)
brevo._domainkey.rfi.steel-detailer.com.    CNAME    brevo.domainkey.brevo.com.
brevo2._domainkey.rfi.steel-detailer.com.   CNAME    brevo2.domainkey.brevo.com.

# DMARC Record (Recommended for email security)
_dmarc.rfi.steel-detailer.com.    TXT    "v=DMARC1; p=none; rua=mailto:dmarc@steel-detailer.com"
```

### Brevo Dashboard Setup
1. **Domain Verification**: Add `rfi.steel-detailer.com` in Brevo dashboard
2. **DNS Validation**: Verify all DNS records are properly configured
3. **Webhook Configuration**: 
   - URL: `https://yourdomain.com/api/rfis/email-reply`
   - Events: Enable "Inbound Email" webhook
   - Authentication: Use webhook secret for security

## Deployment Checklist

### Development to Test Server Migration

#### 1. Environment Setup
- [ ] Update `BREVO_API_KEY` with production/test API key
- [ ] Set `BREVO_REPLY_DOMAIN` to your domain (e.g., `rfi.steel-detailer.com`)
- [ ] Generate secure `BREVO_WEBHOOK_SECRET` (use strong random string)
- [ ] Update `NEXT_PUBLIC_APP_URL` to your server URL

#### 2. DNS Configuration
- [ ] Configure MX record pointing to `mail.brevo.com`
- [ ] Set up DKIM records for email authentication
- [ ] Configure DMARC policy for email security
- [ ] Verify DNS propagation (may take 24-48 hours)

#### 3. Brevo Dashboard Configuration
- [ ] Add and verify your domain in Brevo
- [ ] Configure inbound parsing webhook
- [ ] Test webhook endpoint connectivity
- [ ] Verify email sending works from your domain

#### 4. Server Configuration
- [ ] Ensure `uploads/` directory exists and is writable
- [ ] Verify file upload permissions and storage limits
- [ ] Check that webhook endpoint is publicly accessible
- [ ] Configure SSL/HTTPS for webhook security

#### 5. Testing
- [ ] Send test RFI email and verify delivery
- [ ] Reply to test email and check webhook processing
- [ ] Test attachment handling with various file types
- [ ] Verify responses appear correctly in UI
- [ ] Test token security validation

### Security Considerations

#### Token Security
- Use strong webhook secret (minimum 32 characters)
- Tokens are time-based and expire for security
- HMAC-SHA256 ensures response authenticity

#### File Security
- Files >10MB are automatically rejected
- Dangerous file types (.exe, .bat, etc.) are blocked
- Unique UUID filenames prevent conflicts
- Files stored outside web root for security

#### Access Control
- Only registered users can send email responses
- Email sender must match user in database
- Invalid tokens return 401 Unauthorized

## Troubleshooting

### Common Issues

#### Emails Not Delivered
- Check DNS configuration and propagation
- Verify MX record points to `mail.brevo.com`
- Confirm domain is verified in Brevo dashboard
- Check email logs in Brevo dashboard

#### Webhook Not Triggered
- Verify webhook URL is publicly accessible
- Check webhook configuration in Brevo
- Ensure webhook endpoint returns 200 status
- Review server logs for webhook calls

#### Token Validation Failing
- Check `BREVO_WEBHOOK_SECRET` matches in all environments
- Verify token generation and parsing logic
- Consider time-based token expiration
- Check for URL encoding issues

#### Attachments Not Processing
- Verify uploads directory exists and is writable
- Check file size limits (10MB default)
- Review blocked file types list
- Ensure Brevo API key has attachment access

### Debug Endpoints

#### Test Token Generation
```bash
GET /api/test/email-reply?rfiId={rfiId}
```

#### Test Webhook Processing
```bash
POST /api/test/email-reply
Content-Type: application/json
```

#### Server Logs
Monitor webhook endpoint logs:
```bash
tail -f server.log | grep "email-reply"
```

## Monitoring and Maintenance

### Email Usage Tracking
The system tracks daily email usage to stay within Brevo's free tier limits (300 emails/day):
- Daily usage stored in `EmailUsage` table
- Queue system for rate limiting
- Automatic fallback if limits exceeded

### Regular Maintenance
- Monitor email delivery rates
- Review webhook processing logs
- Clean up old attachment files if needed
- Update DNS records if domain changes

### Scaling Considerations
- Consider paid Brevo plan for higher email volumes
- Implement file storage optimization for attachments
- Add email response notification system
- Consider multiple domain support for larger organizations

## API Reference

### Webhook Payload Structure
```typescript
interface BrevoInboundPayload {
  From: string              // Sender email address
  To: string               // Reply-to address with token
  Subject: string          // Email subject
  Text: string            // Plain text content
  Html?: string           // HTML content (optional)
  Date: string            // Email timestamp
  MessageId: string       // Unique message identifier
  Headers?: Record<string, string>  // Email headers
  Attachments?: BrevoAttachment[]   // Email attachments
}

interface BrevoAttachment {
  Name: string            // Original filename
  ContentType: string     // MIME type
  ContentLength: number   // File size in bytes
  ContentID: string       // Content identifier
  DownloadToken: string   // Token for downloading file
}
```

### Response Processing
- Creates `Response` record in database
- Links response to RFI and user
- Processes attachments if present
- Logs email activity
- Returns success/error status

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs for error details
3. Test with debug endpoints
4. Verify DNS and Brevo configuration
5. Contact system administrator if issues persist

---

**Last Updated**: July 29, 2025  
**Version**: 1.0.0  
**Status**: Production Ready