/**
 * Email Utility for Password Reset and User Communications
 * Handles sending emails using nodemailer with configurable transporter
 */

const nodemailer = require('nodemailer');
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter based on environment configuration
     * Supports multiple email providers and development/production modes
     */
    initializeTransporter() {
        const emailConfig = this.getEmailConfig();
        
        try {
            this.transporter = nodemailer.createTransport(emailConfig);
            this.isConfigured = true;
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.warn('⚠️ Email service initialization failed:', error.message);
            console.warn('📧 Password reset emails will be logged to console in development');
            this.isConfigured = false;
        }
    }

    /**
     * Get email configuration based on environment variables
     * Falls back to console logging for development
     */
    getEmailConfig() {
        // Production email configuration (customize based on your email provider)
        if (process.env.NODE_ENV === 'production') {
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                return {
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT) || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                };
            }
        }

        // Development configuration - logs to console instead of sending
        return {
            streamTransport: true,
            newline: 'unix',
            buffer: true
        };
    }

    /**
     * Send password reset email
     * @param {string} email - Recipient email address
     * @param {string} resetToken - Password reset token
     * @param {string} baseUrl - Base URL for the application
     * @returns {Promise<boolean>} - Success status
     */
    async sendPasswordResetEmail(email, resetToken, baseUrl = 'http://localhost:3000') {
        if (!this.isConfigured) {
            return this.logPasswordResetEmail(email, resetToken, baseUrl);
        }

        const resetUrl = `${baseUrl}/#reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@pedalplayground.com',
            to: email,
            subject: 'Reset Your Pedal Playground Password',
            html: this.generatePasswordResetHTML(resetUrl, email),
            text: this.generatePasswordResetText(resetUrl, email)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('📧 Password reset email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error.message);
            return false;
        }
    }

    /**
     * Log password reset email to console for development
     * @param {string} email - Recipient email address
     * @param {string} resetToken - Password reset token
     * @param {string} baseUrl - Base URL for the application
     * @returns {Promise<boolean>} - Always returns true for development
     */
    async logPasswordResetEmail(email, resetToken, baseUrl) {
        const resetUrl = `${baseUrl}/#reset-password?token=${resetToken}`;
        
        console.log('\n🔧 DEVELOPMENT MODE - PASSWORD RESET EMAIL');
        console.log('==========================================');
        console.log(`To: ${email}`);
        console.log(`Subject: Reset Your Pedal Playground Password`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log(`Token: ${resetToken}`);
        console.log('==========================================\n');
        
        return true;
    }

    /**
     * Generate HTML email content for password reset
     * @param {string} resetUrl - Complete reset URL with token
     * @param {string} email - Recipient email address
     * @returns {string} - HTML email content
     */
    generatePasswordResetHTML(resetUrl, email) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - Pedal Playground</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }
                .email-container {
                    background-color: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #8576f7;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #8576f7;
                    text-decoration: none;
                }
                .content {
                    margin-bottom: 30px;
                }
                .reset-button {
                    display: inline-block;
                    background-color: #8576f7;
                    color: white;
                    padding: 14px 28px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 20px 0;
                    text-align: center;
                }
                .reset-button:hover {
                    background-color: #7366e6;
                }
                .footer {
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                    font-size: 14px;
                    color: #666;
                    text-align: center;
                }
                .warning {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 4px;
                    padding: 12px;
                    margin: 20px 0;
                    color: #856404;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .email-container {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <a href="http://localhost:3000" class="logo">🎸 Pedal Playground</a>
                </div>
                
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>Hi there,</p>
                    <p>We received a request to reset the password for your Pedal Playground account associated with <strong>${email}</strong>.</p>
                    <p>If you made this request, click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="reset-button">Reset My Password</a>
                    </div>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                        ${resetUrl}
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> This password reset link will expire in 1 hour for security reasons.
                    </div>
                    
                    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                </div>
                
                <div class="footer">
                    <p>This email was sent from Pedal Playground, your guitar effects pedalboard planning tool.</p>
                    <p>If you have any questions, please contact support.</p>
                    <p style="font-size: 12px; margin-top: 20px;">
                        This is an automated message, please don't reply to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate plain text email content for password reset
     * @param {string} resetUrl - Complete reset URL with token
     * @param {string} email - Recipient email address
     * @returns {string} - Plain text email content
     */
    generatePasswordResetText(resetUrl, email) {
        return `
🎸 PEDAL PLAYGROUND - PASSWORD RESET REQUEST

Hi there,

We received a request to reset the password for your Pedal Playground account associated with ${email}.

If you made this request, visit this link to reset your password:
${resetUrl}

⚠️ IMPORTANT: This password reset link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
This email was sent from Pedal Playground, your guitar effects pedalboard planning tool.
If you have any questions, please contact support.

This is an automated message, please don't reply to this email.
        `.trim();
    }

    /**
     * Send welcome email to new users
     * @param {string} email - New user's email address
     * @param {string} firstName - User's first name (optional)
     * @returns {Promise<boolean>} - Success status
     */
    async sendWelcomeEmail(email, firstName = '') {
        if (!this.isConfigured) {
            console.log(`📧 DEVELOPMENT: Welcome email would be sent to ${email}`);
            return true;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@pedalplayground.com',
            to: email,
            subject: 'Welcome to Pedal Playground! 🎸',
            html: this.generateWelcomeHTML(email, firstName),
            text: this.generateWelcomeText(email, firstName)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('📧 Welcome email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error.message);
            return false;
        }
    }

    /**
     * Generate HTML welcome email content
     * @param {string} email - User's email address
     * @param {string} firstName - User's first name
     * @returns {string} - HTML email content
     */
    generateWelcomeHTML(email, firstName) {
        const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
        
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Pedal Playground</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }
                .email-container {
                    background-color: white;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #8576f7;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #8576f7;
                    text-decoration: none;
                }
                .welcome-button {
                    display: inline-block;
                    background-color: #8576f7;
                    color: white;
                    padding: 14px 28px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 20px 0;
                    text-align: center;
                }
                .features {
                    background-color: #f8f9fa;
                    border-radius: 6px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .feature-item {
                    margin-bottom: 10px;
                }
                .footer {
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                    font-size: 14px;
                    color: #666;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <a href="http://localhost:3000" class="logo">🎸 Pedal Playground</a>
                </div>
                
                <div class="content">
                    <h2>Welcome to Pedal Playground!</h2>
                    <p>${greeting},</p>
                    <p>Thanks for joining Pedal Playground! Your account has been successfully created and you're ready to start planning your perfect pedalboard.</p>
                    
                    <div style="text-align: center;">
                        <a href="http://localhost:3000" class="welcome-button">Start Building Your Pedalboard</a>
                    </div>
                    
                    <div class="features">
                        <h3>What you can do with Pedal Playground:</h3>
                        <div class="feature-item">🎛️ <strong>Arrange pedals visually</strong> - Drag and drop pedals on virtual pedalboards</div>
                        <div class="feature-item">📏 <strong>Real dimensions</strong> - Work with accurate pedal and pedalboard measurements</div>
                        <div class="feature-item">❤️ <strong>Save favorites</strong> - Keep track of your favorite pedals and pedalboards</div>
                        <div class="feature-item">💾 <strong>Save layouts</strong> - Save your pedalboard configurations and access them from any device</div>
                        <div class="feature-item">🎨 <strong>Customize everything</strong> - Create custom pedals and pedalboards with your own dimensions</div>
                    </div>
                    
                    <p>We're excited to see what pedalboards you'll create! If you have any questions or feedback, don't hesitate to reach out.</p>
                    <p>Happy pedal planning!</p>
                </div>
                
                <div class="footer">
                    <p>The Pedal Playground Team</p>
                    <p style="font-size: 12px; margin-top: 20px;">
                        This is an automated message, please don't reply to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate plain text welcome email content
     * @param {string} email - User's email address
     * @param {string} firstName - User's first name
     * @returns {string} - Plain text email content
     */
    generateWelcomeText(email, firstName) {
        const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
        
        return `
🎸 WELCOME TO PEDAL PLAYGROUND!

${greeting},

Thanks for joining Pedal Playground! Your account has been successfully created and you're ready to start planning your perfect pedalboard.

Visit Pedal Playground: http://localhost:3000

What you can do with Pedal Playground:
🎛️ Arrange pedals visually - Drag and drop pedals on virtual pedalboards
📏 Real dimensions - Work with accurate pedal and pedalboard measurements  
❤️ Save favorites - Keep track of your favorite pedals and pedalboards
💾 Save layouts - Save your pedalboard configurations and access them from any device
🎨 Customize everything - Create custom pedals and pedalboards with your own dimensions

We're excited to see what pedalboards you'll create! If you have any questions or feedback, don't hesitate to reach out.

Happy pedal planning!

The Pedal Playground Team

---
This is an automated message, please don't reply to this email.
        `.trim();
    }

    /**
     * Verify email service configuration
     * @returns {Promise<boolean>} - Configuration validity
     */
    async verifyConfiguration() {
        if (!this.isConfigured) {
            console.log('📧 Email service not configured - using console logging');
            return false;
        }

        try {
            await this.transporter.verify();
            console.log('✅ Email service configuration verified');
            return true;
        } catch (error) {
            console.error('❌ Email service configuration invalid:', error.message);
            return false;
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;